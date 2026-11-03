import React, { useContext, useEffect, useId, useRef, useState } from 'react';
import { Plus, X, Upload, Edit, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, LayoutGrid, Image } from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { storageAPI } from '../../../services/api';
import {
  CATEGORY_NAME_MAX_LENGTH,
  IMAGE_UPLOAD_RULES,
  categoryNameKey,
  normalizeCategoryName,
  validateImageFile
} from '../../../utils/validation';
import { countProductsInCategory } from '../../../utils/categories';
import {
  cleanupUnusedImage, cleanupUnusedImages, retryPendingCleanups,
  holdImagesForWrite, releaseWriteHold, resolvePendingWrites, setDraftImages
} from '../../../utils/storageCleanup';
import { newOperationId } from '../../../utils/operationId';
import { useAdminExitGuard, useBrowserExitGuard } from '../exitGuard';
import { logAuditAction, AUDIT_ACTIONS } from '../../../services/auditLog';

const UPLOAD_TIMEOUT_MS = 60000;

let draftCounter = 0;
let sectionCounter = 0;

const ABORTED_NOTICE = 'Oldingi saqlash amalga oshmadi — hech narsa saqlanmadi. Rasm saqlab qolindi, qayta saqlashingiz mumkin.';
const COMMITTED_NOTICE = 'Oldingi saqlash serverda bajarilgan edi. Formadagi keyingi o\'zgarishlar hali saqlanmagan.';
const newDraft = (category = null) => ({
  key: ++draftCounter,
  mode: category ? 'edit' : 'create',
  categoryId: category?.id ?? null,
  original: category,
  name: category?.name || '',
  image: category?.image || ''
});

const isDirty = (draft) =>
  !!draft && (draft.name !== (draft.original?.name || '') || draft.image !== (draft.original?.image || ''));

/**
 * Admin "Kategoriyalar" section.
 *
 * Module-level (not nested in DesktopAdminPanel) so parent re-renders do not
 * remount it and discard the draft. One explicit draft object drives the
 * form: Add always starts a fresh draft, Edit loads the chosen category, and
 * Cancel/Close discard it directly (an explicit user decision) while cleaning
 * up images uploaded only for that draft.
 *
 * Leaving the section (sidebar, dashboard shortcut, logout) with unsaved
 * changes or a running upload asks first; cancelling keeps the draft. If the
 * section unmounts anyway, pending uploads are invalidated and unsaved draft
 * uploads are cleaned up.
 *
 * Every save holds the images it involves (new image, replaced image, other
 * draft uploads) under its operation id BEFORE the request is sent. The hold
 * survives unmount, Cancel/Close and reload, and is released only once the
 * save's outcome is definitive; an uncertain outcome keeps it until
 * resolve_category_write answers (retried whenever this section opens).
 *
 * Independently of those holds, the images the open draft uses are registered
 * as owned by it (setDraftImages), so resolving an earlier save — e.g. as
 * aborted — never deletes an image the form still shows. The form is told the
 * outcome of its own earlier save and cleans its images itself when discarded.
 */
const CategoriesSection = () => {
  const {
    categories, products, refreshCatalog,
    addCategory, updateCategory, deleteCategory, reorderCategories, toggleCategoryVisibility
  } = useContext(AdminContext);
  const toast = useToast();
  const confirm = useConfirm();
  const ids = useId();

  const [draft, setDraftState] = useState(null);
  const draftRef = useRef(null);
  // URLs uploaded for the current draft and not yet saved to a category
  const draftUploads = useRef(new Set());
  const ownerId = useRef(null);
  if (ownerId.current === null) ownerId.current = `categories-section-${++sectionCounter}`;

  // Keep the cleanup module's view of "images the live draft uses" current:
  // its uploads plus whatever image the form shows
  const syncDraftOwnership = () => {
    const d = draftRef.current;
    setDraftImages(ownerId.current, d ? [...draftUploads.current, d.image] : []);
  };
  const setDraft = (next) => {
    draftRef.current = next;
    syncDraftOwnership();
    setDraftState(next);
  };

  const [errors, setErrors] = useState({});
  const [previewFailed, setPreviewFailed] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);
  const uploadSeq = useRef(0);
  // Saves of this section whose outcome is still unknown: opId → submitted values
  const pendingOps = useRef(new Map());
  // Re-render when pendingOps changes (it feeds the exit guards)
  const [, setPendingVersion] = useState(0);
  const bumpPending = () => setPendingVersion(v => v + 1);
  const hasPendingSave = (draftKey) =>
    [...pendingOps.current.values()].some(p => p.draftKey === draftKey);
  const [saveNotice, setSaveNotice] = useState(null);

  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(false);
  const uploadingRef = useRef(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [reordering, setReordering] = useState(false);

  const nameInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const uploading = !!draft && uploadingKey === draft.key;
  const list = categories || [];

  // An earlier save of the open draft turned out to have COMMITTED. Wait for
  // the authoritative catalog, then — only if that same draft is still open —
  // either close it (it shows exactly what was saved) or make the committed
  // record its saved baseline while keeping the admin's later edits (V4-01).
  // An Add draft becomes an Edit of the category it created, so saving the
  // later edits updates that category instead of creating a second one.
  const applyRecoveredCommit = async (pending, catalog) => {
    const current = draftRef.current;
    if (!mountedRef.current || current?.key !== pending.draftKey) return; // closed or replaced meanwhile

    const unchanged = normalizeCategoryName(current.name) === pending.name && current.image.trim() === pending.image;
    if (unchanged) {
      toast.success('Oldingi saqlash muvaffaqiyatli yakunlangan');
      draftUploads.current.delete(pending.image); // saved: referenced, not ours to clean
      closeDraft();
      return;
    }

    const fromServer = current.mode === 'edit'
      ? catalog?.categories?.find(c => c.id === current.categoryId)
      : catalog?.categories?.find(c => categoryNameKey(c.name) === categoryNameKey(pending.name));
    // Without a fresh record, what was submitted is what committed
    const committed = fromServer || (current.mode === 'edit'
      ? { ...current.original, name: pending.name, image: pending.image }
      : null);

    if (committed) {
      // The committed image is now referenced by the category: not a draft leftover
      draftUploads.current.delete(pending.image);
      setDraft({
        ...current,                       // same key and the admin's current name/image
        mode: 'edit',
        categoryId: committed.id ?? current.categoryId,
        original: committed               // new saved baseline
      });
    }
    setSaveNotice({ draftKey: pending.draftKey, kind: 'committed' });
    toast.info(COMMITTED_NOTICE);
  };

  // Resolve held saves (this page's and ones left over from before a reload).
  // For a save of the draft that is still open, tell the form what happened:
  // aborted → nothing was saved, the image is kept (draft-owned) for a retry;
  // committed → refresh, and close the form if it still shows what was saved.
  const settlePendingWrites = async () => {
    let results;
    try {
      results = await resolvePendingWrites();
    } catch {
      return;
    }
    for (const [opId, outcome] of Object.entries(results || {})) {
      const pending = pendingOps.current.get(opId);
      if (!pending || (outcome !== 'committed' && outcome !== 'aborted')) continue;
      pendingOps.current.delete(opId);
      if (mountedRef.current) bumpPending();

      if (outcome === 'committed') {
        // Authoritative state first, then the audit entry the original save
        // could not write (its outcome was unknown at the time)
        let catalog = null;
        try {
          catalog = await refreshCatalog?.();
        } catch (err) {
          console.error('❌ Catalog refresh after a recovered commit failed:', err);
        }
        const saved = pending.categoryId
          ? catalog?.categories?.find(c => c.id === pending.categoryId)
          : catalog?.categories?.find(c => categoryNameKey(c.name) === categoryNameKey(pending.name));
        Promise.resolve(logAuditAction({
          action: pending.categoryId ? AUDIT_ACTIONS.CATEGORY_UPDATE : AUDIT_ACTIONS.CATEGORY_CREATE,
          entityType: 'category',
          entityId: saved?.id ?? pending.categoryId ?? pending.name,
          oldData: pending.original || null,
          newData: saved || { name: pending.name, image: pending.image },
          metadata: { recoveredAfterUnknownOutcome: true, opId }
        })).catch(() => {});
        if (mountedRef.current && draftRef.current?.key === pending.draftKey) {
          await applyRecoveredCommit(pending, catalog);
        }
      } else if (mountedRef.current && draftRef.current?.key === pending.draftKey) {
        setSaveNotice({ draftKey: pending.draftKey, kind: 'aborted' });
        toast.warning(ABORTED_NOTICE);
      }
    }
  };

  // Settle saves whose outcome was unknown, then retry failed deletions
  // (each URL is re-checked; held and draft-owned URLs are skipped)
  useEffect(() => {
    settlePendingWrites()
      .then(() => retryPendingCleanups())
      .catch(() => {});
  }, []);

  // Unmount (section switch, logout, panel reload): drop the draft, make any
  // pending upload stale, and clean up unsaved uploads (images held by a
  // save in flight or with an unknown outcome are skipped by the cleanup).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      uploadSeq.current += 1;
      draftRef.current = null;
      uploadingRef.current = false;
      const unsaved = [...draftUploads.current];
      draftUploads.current = new Set();
      setDraftImages(ownerId.current, []); // the draft is gone: release ownership first
      if (unsaved.length) cleanupUnusedImages(unsaved);
    };
  }, []);

  // Discard the current draft: invalidate pending uploads, clean up unsaved uploads
  const closeDraft = () => {
    uploadSeq.current += 1;
    const unsaved = [...draftUploads.current];
    draftUploads.current = new Set();
    uploadingRef.current = false;
    setUploadingKey(null);
    setErrors({});
    setPreviewFailed(false);
    setSaveNotice(null);
    setDraft(null); // releases draft ownership before the cleanup below
    if (unsaved.length) cleanupUnusedImages(unsaved);
  };

  // A draft whose earlier save has an unknown outcome is unsaved work too:
  // its baseline may be outdated, so "looks clean" cannot be trusted yet
  const hasUnsavedWork = () => isDirty(draftRef.current) || uploadingRef.current ||
    (!!draftRef.current && hasPendingSave(draftRef.current.key));

  const confirmDiscard = () => confirm({
    title: 'Saqlanmagan o\'zgarishlar',
    message: 'Joriy kategoriya formasidagi saqlanmagan o\'zgarishlar yo\'qoladi. Davom etasizmi?',
    type: 'warning',
    confirmText: 'Davom etish',
    cancelText: 'Bekor qilish'
  });

  const openDraft = async (next) => {
    if (savingRef.current) return;
    if (hasUnsavedWork() && !(await confirmDiscard())) return;
    closeDraft();
    setDraft(next);
  };

  // One rule for every exit: refuse while a save runs; ask when a draft is
  // dirty or an upload is running; otherwise leave. Confirming lets the
  // section unmount (cleanup above); cancelling keeps route and draft.
  const askToLeave = async () => {
    if (savingRef.current) {
      toast.info('Kategoriya saqlanmoqda, biroz kuting');
      return false;
    }
    if (!hasUnsavedWork()) return true;
    return confirmDiscard();
  };
  useAdminExitGuard(askToLeave);
  // Browser exits (reload/close via beforeunload, Back via history) use the
  // same conditions, from render state so the listener follows them
  useBrowserExitGuard(
    isDirty(draft) || uploadingKey !== null || saving || (!!draft && hasPendingSave(draft.key)),
    askToLeave
  );

  const updateDraft = (changes) => {
    if (!draftRef.current) return;
    setDraft({ ...draftRef.current, ...changes });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draftRef.current) return;

    try {
      validateImageFile(file, IMAGE_UPLOAD_RULES.category);
    } catch (err) {
      setErrors(prev => ({ ...prev, image: err.message }));
      toast.error(err.message);
      return;
    }

    const key = draftRef.current.key;
    const seq = ++uploadSeq.current;
    const isCurrent = () => mountedRef.current && uploadSeq.current === seq && draftRef.current?.key === key;

    uploadingRef.current = true;
    setUploadingKey(key);
    setErrors(prev => ({ ...prev, image: null }));

    const uploadPromise = storageAPI.uploadCategoryImage(file);
    let timer;
    let timedOut = false;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(new Error('Yuklash vaqti tugadi. Internet aloqasini tekshirib, qayta urinib ko\'ring.'));
      }, UPLOAD_TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([uploadPromise, timeoutPromise]);

      // Draft was closed, switched, or a newer upload started: drop this result
      if (!isCurrent()) {
        cleanupUnusedImage(result.url).catch(() => {});
        return;
      }

      const previous = draftRef.current.image;
      const replacedUpload = previous && draftUploads.current.has(previous);
      if (replacedUpload) draftUploads.current.delete(previous);
      draftUploads.current.add(result.url);
      setPreviewFailed(false);
      updateDraft({ image: result.url }); // ownership now covers the new image only
      if (replacedUpload) cleanupUnusedImage(previous).catch(() => {});
    } catch (error) {
      // The storage request cannot be aborted; if it finishes after the timeout, delete it
      if (timedOut) {
        uploadPromise.then(r => cleanupUnusedImage(r.url)).catch(() => {});
      }
      if (isCurrent()) {
        console.error('❌ Category image upload failed:', error);
        setErrors(prev => ({ ...prev, image: `Rasm yuklashda xatolik: ${error.message}` }));
        toast.error(`Rasm yuklashda xatolik: ${error.message}`);
      }
    } finally {
      clearTimeout(timer);
      if (uploadSeq.current === seq) {
        uploadingRef.current = false;
        setUploadingKey(null);
      }
    }
  };

  const validateDraft = (d) => {
    const name = normalizeCategoryName(d.name);
    const image = d.image.trim();
    const errs = {};

    if (!name) {
      errs.name = 'Kategoriya nomini kiriting';
    } else if (name.length > CATEGORY_NAME_MAX_LENGTH) {
      errs.name = `Kategoriya nomi ${CATEGORY_NAME_MAX_LENGTH} belgidan oshmasligi kerak`;
    } else if (list.some(c => c.id !== d.categoryId && categoryNameKey(c.name) === categoryNameKey(name))) {
      errs.name = 'Bunday nomli kategoriya allaqachon mavjud';
    }

    if (!image) {
      errs.image = 'Kategoriya rasmini yuklang yoki rasm URL manzilini kiriting';
    } else if (!/^https?:\/\/\S+$/i.test(image)) {
      errs.image = 'Rasm URL manzili http:// yoki https:// bilan boshlanishi kerak';
    }

    return { name, image, errs };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let d = draftRef.current;
    // Synchronous guard: a second submit before the first finishes is ignored
    if (!d || savingRef.current || uploading) return;

    // An earlier save of this draft has an unknown outcome: try to settle it
    // first, so the comparison below uses what is really stored. Settling may
    // close the form (it committed exactly these values) or rebase it.
    if (hasPendingSave(d.key)) {
      savingRef.current = true;
      setSaving(true);
      try {
        await settlePendingWrites();
      } finally {
        savingRef.current = false;
        if (mountedRef.current) setSaving(false);
      }
      d = draftRef.current;
      if (!d || !mountedRef.current) return;
    }
    // Still unknown: the baseline may be outdated, so send every field
    // instead of a diff — the server's expected-name check decides.
    const forceFullSave = hasPendingSave(d.key);

    const { name, image, errs } = validateDraft(d);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      (errs.name ? nameInputRef : imageInputRef).current?.focus();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveNotice(null);

    // Hold every image this save touches until its outcome is definitive
    const opId = newOperationId();
    holdImagesForWrite(opId, [image, d.original?.image, ...draftUploads.current]);
    let outcomeKnown = true;
    let saved = false;

    try {
      if (d.mode === 'edit') {
        const updates = {};
        if (forceFullSave || name !== d.original.name) updates.name = name;
        if (forceFullSave || image !== d.original.image) updates.image = image;
        if (Object.keys(updates).length > 0) {
          await updateCategory(d.categoryId, updates, { opId });
        }
        toast.success('Kategoriya muvaffaqiyatli yangilandi');
      } else {
        await addCategory({ name, image }, { opId });
        toast.success('Kategoriya muvaffaqiyatli qo\'shildi');
      }
      saved = true;
      // The hold's release (below) cleans up the replaced image and the
      // other draft uploads; the saved image is referenced and stays
      draftUploads.current = new Set();
      if (mountedRef.current) closeDraft();
      else syncDraftOwnership();
    } catch (error) {
      outcomeKnown = error?.code !== 'outcome_unknown';
      if (!outcomeKnown) {
        pendingOps.current.set(opId, {
          draftKey: d.key, name, image,
          categoryId: d.mode === 'edit' ? d.categoryId : null,
          original: d.original || null
        });
        if (mountedRef.current) bumpPending();
      }
      console.error('❌ Failed to save category:', error);
      if (error?.code === 'category_duplicate') {
        if (mountedRef.current) setErrors({ name: error.message });
        toast.error(error.message);
      } else if (['outcome_unknown', 'category_not_saved', 'category_stale', 'category_forbidden', 'migration_required', 'category_not_updated'].includes(error?.code)) {
        toast.error(error.message);
      } else {
        toast.error('Kategoriyani saqlashda xatolik. Qayta urinib ko\'ring.');
      }
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
      if (outcomeKnown) {
        // Definitive: release the hold and run the reference-checked cleanup.
        // Images an open form still uses are draft-owned and skipped.
        releaseWriteHold(opId, { cleanup: true }).catch(() => {});
      }
      // Unknown outcome: the hold stays (also across reload) until
      // resolve_category_write reports committed/aborted
      settlePendingWrites().catch(() => {});
    }
  };

  const setBusy = (id, on) => setBusyIds(prev => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });

  const handleDelete = async (category) => {
    const productCount = countProductsInCategory(products, category.name);
    if (productCount > 0) {
      toast.warning(`"${category.name}" kategoriyasida ${productCount} ta mahsulot bor. O'chirishdan oldin ularni boshqa kategoriyaga o'tkazing.`);
      return;
    }

    const confirmed = await confirm({
      title: 'Kategoriyani o\'chirish',
      message: `"${category.name}" kategoriyasi o'chiriladi. Unda mahsulotlar yo'q. Bu amalni ortga qaytarib bo'lmaydi.`,
      type: 'danger',
      confirmText: 'O\'chirish',
      cancelText: 'Bekor qilish'
    });
    if (!confirmed) return;

    setBusy(category.id, true);
    try {
      await deleteCategory(category.id);
      if (draftRef.current?.categoryId === category.id) closeDraft();
      toast.success('Kategoriya muvaffaqiyatli o\'chirildi');
    } catch (error) {
      console.error('❌ Failed to delete category:', error);
      toast.error(['category_in_use', 'outcome_unknown', 'category_forbidden', 'category_not_deleted'].includes(error?.code)
        ? error.message
        : 'Kategoriyani o\'chirishda xatolik. Qayta urinib ko\'ring.');
    } finally {
      setBusy(category.id, false);
    }
  };

  const handleMoveCategory = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (reordering || newIndex < 0 || newIndex >= list.length) return;

    const reordered = [...list];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    setReordering(true);
    try {
      await reorderCategories(reordered);
    } catch (error) {
      console.error('❌ Failed to reorder categories:', error);
      toast.error(['outcome_unknown', 'category_stale', 'category_forbidden', 'migration_required'].includes(error?.code)
        ? error.message
        : 'Kategoriyalar tartibini saqlashda xatolik');
    } finally {
      setReordering(false);
    }
  };

  const handleToggleVisibility = async (categoryId, currentVisibility) => {
    if (busyIds.has(categoryId)) return;
    setBusy(categoryId, true);
    try {
      await toggleCategoryVisibility(categoryId, !currentVisibility);
      toast.success(!currentVisibility ? 'Kategoriya ko\'rsatilmoqda' : 'Kategoriya yashirildi');
    } catch (error) {
      console.error('❌ Failed to toggle category visibility:', error);
      toast.error('Kategoriya holatini o\'zgartirishda xatolik');
    } finally {
      setBusy(categoryId, false);
    }
  };

  const nameId = `${ids}-name`;
  const nameErrorId = `${ids}-name-error`;
  const imageUrlId = `${ids}-image-url`;
  const imageHintId = `${ids}-image-hint`;
  const imageErrorId = `${ids}-image-error`;
  const formTitleId = `${ids}-form-title`;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Kategoriyalarni boshqarish</h3>
          <p className="a-muted">{list.length} ta kategoriya</p>
        </div>
        <button
          type="button"
          onClick={() => openDraft(newDraft())}
          disabled={saving}
          className="a-btn a-btn-primary"
        >
          <Plus className="w-5 h-5" />
          Kategoriya qo'shish
        </button>
      </div>

      {/* Add/Edit Form */}
      {draft && (
        <div className="a-card">
          <div className="a-card-h">
            <h3 id={formTitleId}>
              {draft.mode === 'edit' ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya qo\'shish'}
            </h3>
            <button
              type="button"
              onClick={closeDraft}
              disabled={saving}
              aria-label="Formani yopish"
              className="a-faint hover:opacity-70"
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate aria-labelledby={formTitleId} className="space-y-4" style={{ padding: 16 }}>
            <div>
              <label htmlFor={nameId} className="block text-sm font-medium a-muted mb-2">Kategoriya nomi *</label>
              <input
                id={nameId}
                ref={nameInputRef}
                type="text"
                value={draft.name}
                onChange={(e) => {
                  updateDraft({ name: e.target.value });
                  if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                }}
                className="a-input"
                placeholder="Masalan: Choyshablar"
                maxLength={CATEGORY_NAME_MAX_LENGTH}
                required
                aria-required="true"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? nameErrorId : undefined}
                style={errors.name ? { borderColor: 'var(--danger)' } : undefined}
              />
              {errors.name && (
                <p id={nameErrorId} role="alert" className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.name}</p>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium a-muted mb-2">Kategoriya rasmi *</span>
              <div className="space-y-3">
                <div>
                  <label
                    className="a-btn a-btn-primary w-full justify-center cursor-pointer"
                    style={{ padding: '12px 16px', opacity: uploading || saving ? 0.6 : 1 }}
                  >
                    <Upload className="w-5 h-5" aria-hidden="true" />
                    <span>{uploading ? 'Yuklanmoqda...' : 'Qurilmadan rasm yuklash'}</span>
                    <input
                      type="file"
                      accept={IMAGE_UPLOAD_RULES.category.types.join(',')}
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading || saving}
                      aria-describedby={imageHintId}
                    />
                  </label>
                  <p id={imageHintId} className="text-xs a-faint mt-1">PNG, JPG, WEBP yoki SVG, 2 MB gacha</p>
                </div>

                <div className="flex items-center gap-3" aria-hidden="true">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
                  <span className="text-sm a-faint font-medium">YOKI</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
                </div>

                <div>
                  <label htmlFor={imageUrlId} className="block text-sm font-medium a-muted mb-2">Rasm URL manzili</label>
                  <input
                    id={imageUrlId}
                    ref={imageInputRef}
                    type="url"
                    value={draft.image}
                    onChange={(e) => {
                      updateDraft({ image: e.target.value });
                      setPreviewFailed(false);
                      if (errors.image) setErrors(prev => ({ ...prev, image: null }));
                    }}
                    className="a-input"
                    placeholder="Rasm URL manzilini kiriting (https://...)"
                    disabled={uploading}
                    required
                    aria-required="true"
                    aria-invalid={errors.image ? 'true' : 'false'}
                    aria-describedby={errors.image ? imageErrorId : undefined}
                    style={errors.image ? { borderColor: 'var(--danger)' } : undefined}
                  />
                  {errors.image && (
                    <p id={imageErrorId} role="alert" className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.image}</p>
                  )}
                </div>

                {draft.image && (
                  <div className="mt-2">
                    {previewFailed ? (
                      <div
                        role="status"
                        className="w-32 h-32 rounded-lg flex flex-col items-center justify-center text-center a-faint text-xs gap-1 p-2"
                        style={{ border: '1px dashed var(--border)' }}
                      >
                        <Image className="w-6 h-6" aria-hidden="true" />
                        Rasmni ko'rsatib bo'lmadi. URL manzilini tekshiring.
                      </div>
                    ) : (
                      <img
                        key={draft.image}
                        src={draft.image}
                        alt="Ko'rinishi"
                        className="w-32 h-32 object-cover rounded-lg"
                        style={{ border: '1px solid var(--border)' }}
                        onError={() => setPreviewFailed(true)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {saveNotice?.draftKey === draft.key && (
              <p role="status" className="text-sm" style={{ color: saveNotice.kind === 'aborted' ? 'var(--warn, var(--danger))' : 'var(--text-2, var(--text))' }}>
                {saveNotice.kind === 'aborted' ? ABORTED_NOTICE : COMMITTED_NOTICE}
              </p>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving || uploading}
                className="a-btn a-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? 'Saqlanmoqda...'
                  : draft.mode === 'edit' ? 'Kategoriyani yangilash' : 'Kategoriya qo\'shish'}
              </button>
              <button
                type="button"
                onClick={closeDraft}
                disabled={saving}
                className="a-btn"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((category, index) => {
          const busy = busyIds.has(category.id);
          const productCount = countProductsInCategory(products, category.name);
          return (
            <div key={category.id} className="a-card" style={{ overflow: 'hidden', opacity: category.visible === false ? 0.6 : 1 }}>
              <div className="relative overflow-hidden" style={{ height: '128px', background: 'var(--surface-2)' }}>
                {category.visible === false && (
                  <span className="a-pill a-pill-danger absolute top-2 right-2 z-10">
                    <EyeOff className="w-3 h-3" aria-hidden="true" />
                    Yashirilgan
                  </span>
                )}
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-contain p-3"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center a-faint">
                    <Image className="w-9 h-9" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{category.name}</h3>
                <p className="a-muted text-sm mb-3">{productCount} ta mahsulot</p>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => openDraft(newDraft(category))}
                    disabled={saving}
                    className="a-btn flex-1 justify-center"
                  >
                    <Edit className="w-4 h-4" aria-hidden="true" />
                    Tahrirlash
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    disabled={busy}
                    className="a-btn flex-1 justify-center"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    O'chirish
                  </button>
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(category.id, category.visible !== false)}
                    disabled={busy}
                    className="a-btn flex-1 justify-center"
                    style={category.visible === false ? { color: 'var(--ok)' } : undefined}
                  >
                    {category.visible === false ? (
                      <>
                        <Eye className="w-4 h-4" aria-hidden="true" />
                        Ko'rsatish
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                        Yashirish
                      </>
                    )}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveCategory(index, 'up')}
                    disabled={index === 0 || reordering}
                    className="a-btn flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                    Yuqoriga
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveCategory(index, 'down')}
                    disabled={index === list.length - 1 || reordering}
                    className="a-btn flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    Pastga
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {list.length === 0 && !draft && (
        <div className="a-card p-12 text-center">
          <LayoutGrid className="w-16 h-16 a-faint mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Hozircha kategoriyalar yo'q</h3>
          <p className="a-muted mb-4">Mahsulotlarni tartibga solish uchun birinchi kategoriyangizni yarating</p>
          <button
            type="button"
            onClick={() => openDraft(newDraft())}
            className="a-btn a-btn-primary inline-flex"
          >
            <Plus className="w-5 h-5" />
            Birinchi kategoriyani qo'shish
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoriesSection;
