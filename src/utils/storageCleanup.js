import { storageAPI, categoriesAPI, extractOwnedStoragePath } from '../services/api';
import { loadFromLocalStorage, saveToLocalStorage } from './helpers';

/**
 * Safe storage cleanup for images that are no longer used.
 *
 * Rules (audit CAT-02 / CAT-13, review R2 / R7):
 *  - Only call this AFTER the database change that stopped using the image
 *    has succeeded.
 *  - Only objects in this project's product-images bucket are touched
 *    (extractOwnedStoragePath); any other URL is ignored.
 *  - The database decides by canonical object identity (bucket + decoded
 *    path) whether anything still references it (storage_reference_status).
 *    Only a definitive "unreferenced" for exactly the same object deletes.
 *  - "unknown" (RPC/network error, undecodable data, mismatch) keeps the file
 *    AND keeps it queued; the queue entry is removed only after a definitive
 *    outcome (deleted, referenced, or not ours).
 *  - Images involved in a category save whose outcome is not yet known are
 *    HELD (review V2-01): the reference check only sees committed rows, so
 *    while that save might still commit, nothing about those images is
 *    trusted. Holds live in localStorage (survive unmount, Cancel and reload)
 *    and are released only when resolve_category_write gives a definitive
 *    committed/aborted answer for that operation.
 *  - Separately, images still used by a LIVE draft (an open category form in
 *    this page) are never cleaned up, whatever happened to an earlier save of
 *    that draft (review V3-01). The draft cleans them itself when it is
 *    discarded, replaced or unmounted. This ownership is in memory on purpose:
 *    a draft does not survive a reload, so after one nothing is owned.
 */

const QUEUE_KEY = 'pendingStorageCleanup';
const HOLDS_KEY = 'categoryWriteHolds';
const QUEUE_LIMIT = 200;
const BUCKET = 'product-images';

const readQueue = () => {
  const q = loadFromLocalStorage(QUEUE_KEY, []);
  return Array.isArray(q) ? q.filter(u => typeof u === 'string') : [];
};

// --- Holds for category saves with an unresolved outcome -------------------
const readHolds = () => {
  const h = loadFromLocalStorage(HOLDS_KEY, []);
  return Array.isArray(h) ? h.filter(x => x && typeof x.opId === 'string' && Array.isArray(x.urls)) : [];
};
const writeHolds = (holds) => saveToLocalStorage(HOLDS_KEY, holds);

export const heldImageUrls = () => new Set(readHolds().flatMap(h => h.urls));

// Protect `urls` from cleanup until operation `opId` is known to have
// committed or aborted. Call BEFORE sending the save.
export const holdImagesForWrite = (opId, urls) => {
  const list = [...new Set((urls || []).filter(Boolean))];
  writeHolds([...readHolds().filter(h => h.opId !== opId), { opId, urls: list, createdAt: new Date().toISOString() }]);
};

// The outcome of `opId` is definitive: drop the hold and (optionally) run the
// normal reference-checked cleanup over its images.
export const releaseWriteHold = async (opId, { cleanup = true } = {}) => {
  const hold = readHolds().find(h => h.opId === opId);
  writeHolds(readHolds().filter(h => h.opId !== opId));
  if (cleanup && hold) await cleanupUnusedImages(hold.urls);
};

// Ask the database for the outcome of every held save. Only a definitive
// 'committed' / 'aborted' releases a hold; 'unknown' keeps it for next time.
// Releasing runs the reference-checked cleanup, which skips images a live
// draft still uses. Returns { [opId]: 'committed' | 'aborted' | 'unknown' }
// so an open form can react to the outcome of its own earlier save.
export const resolvePendingWrites = async () => {
  const results = {};
  for (const { opId } of readHolds()) {
    const outcome = await categoriesAPI.resolveWrite(opId);
    results[opId] = outcome;
    if (outcome === 'committed' || outcome === 'aborted') {
      await releaseWriteHold(opId, { cleanup: true });
    }
  }
  return results;
};

// --- Images owned by live drafts (in memory) -------------------------------
const draftOwners = new Map();

// Declare the images draft `ownerId` currently uses (replaces the previous
// set; an empty list ends ownership). Call before cleaning up anything the
// draft no longer uses.
export const setDraftImages = (ownerId, urls) => {
  const set = new Set((urls || []).filter(Boolean));
  if (set.size) draftOwners.set(ownerId, set);
  else draftOwners.delete(ownerId);
};

const draftOwnedUrls = () => {
  const all = new Set();
  draftOwners.forEach(set => set.forEach(u => all.add(u)));
  return all;
};

// --- Cleanup queue ---------------------------------------------------------
const writeQueue = (urls) => saveToLocalStorage(QUEUE_KEY, [...new Set(urls)].slice(-QUEUE_LIMIT));
const enqueue = (url) => writeQueue([...readQueue(), url]);
const dequeue = (url) => writeQueue(readQueue().filter(u => u !== url));

/**
 * @returns {Promise<'deleted'|'referenced'|'foreign'|'held'|'in_draft'|'unknown'|'kept'|'queued'>}
 *   deleted     object removed
 *   referenced  still in use — kept (definitive)
 *   foreign     not an object of this project's bucket — never deleted
 *   held        used by a save with an unresolved outcome — untouched; the
 *               hold's release runs the cleanup later
 *   in_draft    still used by an open form — untouched; the form cleans it
 *               up when it is discarded
 *   kept        storage removed nothing (missing, or refused by a storage
 *               policy) — nothing more to do
 *   unknown     reference status could not be established — kept and queued
 *   queued      unreferenced, but deletion failed — kept and queued
 */
export const cleanupUnusedImage = async (url) => {
  const path = extractOwnedStoragePath(url);
  if (!path) {
    dequeue(url);
    return 'foreign';
  }

  if (heldImageUrls().has(url)) return 'held';
  if (draftOwnedUrls().has(url)) return 'in_draft';

  const ref = await storageAPI.referenceStatus(url);

  if (ref.status === 'referenced') {
    dequeue(url);
    return 'referenced';
  }

  // Must be a definitive "unreferenced" for the very object we would delete
  if (ref.status !== 'unreferenced' || ref.bucket !== BUCKET || ref.path !== path) {
    enqueue(url);
    return 'unknown';
  }

  try {
    await storageAPI.deleteImage(path);
    dequeue(url);
    return 'deleted';
  } catch (err) {
    if (err?.code === 'storage_not_removed') {
      dequeue(url);
      return 'kept';
    }
    console.error('❌ Storage cleanup failed, queued for retry:', url, err);
    enqueue(url);
    return 'queued';
  }
};

// Clean up several URLs, never throwing
export const cleanupUnusedImages = (urls) =>
  Promise.allSettled([...new Set((urls || []).filter(Boolean))].map(cleanupUnusedImage));

// Retry queued cleanups. Entries stay queued until an attempt is definitive.
export const retryPendingCleanups = async () => {
  for (const url of readQueue()) {
    await cleanupUnusedImage(url);
  }
};
