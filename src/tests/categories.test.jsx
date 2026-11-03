// Regression tests for the Kategoriyalar audit (audit-reports/2026-10-25-categories).
// Each test asserts the corrected behaviour for a CAT-xx finding.
// All database and storage writes are mocked.
import React, { useContext } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AdminContext, AdminProvider } from '../context/AdminContext';
import Panel from '../components/pages/DesktopAdminPanel';
import { useProducts } from '../hooks/useProducts';
import CategoryNavBar from '../components/layout/CategoryNavBar';
import { IMAGE_UPLOAD_RULES, validateImageFile } from '../utils/validation';

const BASE = 'https://proj.supabase.co';
const OWN = `${BASE}/storage/v1/object/public/product-images/`;

const m = vi.hoisted(() => ({
  api: Object.fromEntries(['essentialDataAPI', 'categoriesAPI', 'productsAPI', 'ordersAPI', 'reviewsAPI', 'usersAPI', 'storageAPI', 'settingsAPI'].map(k => [k, {}])),
  from: vi.fn(), rpc: vi.fn(), confirm: vi.fn(), audit: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));
vi.mock('../services/api', async (importOriginal) => ({
  ...m.api,
  isDefinitiveError: (await importOriginal()).isDefinitiveError,
  extractStoragePath: u => u?.split('/product-images/')[1] || null,
  extractOwnedStoragePath: u => (u && u.startsWith('https://proj.supabase.co/storage/v1/object/public/product-images/')
    ? u.slice('https://proj.supabase.co/storage/v1/object/public/product-images/'.length) : null)
}));
vi.mock('../lib/supabase', () => ({ supabase: { from: m.from, rpc: m.rpc, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }) } } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: m.from }) }));
vi.mock('../services/auditLog', () => ({
  logAuditAction: m.audit,
  AUDIT_ACTIONS: { CATEGORY_CREATE: 'category.create', CATEGORY_UPDATE: 'category.update', CATEGORY_DELETE: 'category.delete', CATEGORY_VISIBILITY: 'category.visibility', CATEGORY_REORDER: 'category.reorder' }
}));
vi.mock('../services/telegram', () => ({ notifyUserOrderStatus: vi.fn(), notifyReferrerReward: vi.fn(), notifyAdminLowStock: vi.fn() }));
vi.mock('../services/stockNotifications', () => ({ notifyProductBackInStock: vi.fn() }));
vi.mock('../context/ToastContext', () => ({ useToast: () => m.toast }));
vi.mock('../context/ConfirmContext', () => ({ useConfirm: () => m.confirm }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('../components/admin/sections', () => Object.fromEntries(['DashboardSection', 'OrdersSection', 'StockRequestsSection', 'ReviewsSection', 'UsersSection', 'AnalyticsSection', 'BonusSettingsSection', 'InventorySettingsSection', 'SettingsSection', 'AuditLogsSection', 'WalkInCustomersSection', 'ProductsSection', 'SupportSection'].map(k => [k, () => null])));

let cats, products, latest, shop, db;
// An error the server returned (has a SQLSTATE): the write definitely did not happen
const dbError = (msg, code = '42501') => Object.assign(new Error(msg), { code });
const ownPath = (url) => (url?.startsWith(OWN) ? url.slice(OWN.length) : null);
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function Probe() { latest = useContext(AdminContext); return null; }
function ShopProbe() { shop = useProducts(); return null; }
const field = () => screen.getByLabelText(/Kategoriya nomi/);
const imageField = () => screen.getByLabelText('Rasm URL manzili');
const form = () => field().closest('form');
const submit = () => fireEvent.submit(form());
const submitButton = () => form().querySelector('button[type=submit]');
const fileInput = (container) => container.querySelector('input[type=file]');
const png = (name = 'a.png') => new File(['x'], name, { type: 'image/png' });
const card = (name = 'Audit A') => within(screen.getByRole('heading', { name, exact: true }).closest('.a-card'));
const addButton = () => screen.getByRole('button', { name: "Kategoriya qo'shish", exact: true });

async function ui(overrides = {}) {
  // Default UI mocks record the saved image as referenced, like the database would
  const value = { products, orders: [], reviews: [], users: [], categories: cats, loading: false, addCategory: vi.fn().mockImplementation(async c => { db.refs.add(c.image); return {}; }), updateCategory: vi.fn().mockImplementation(async (id, u) => { if (u.image) db.refs.add(u.image); return {}; }), deleteCategory: vi.fn().mockResolvedValue(), toggleCategoryVisibility: vi.fn().mockResolvedValue({}), reorderCategories: vi.fn().mockResolvedValue(), ...overrides };
  const result = render(<AdminContext.Provider value={value}><Panel onLogout={overrides.onLogout} /></AdminContext.Provider>);
  await goTo(/^Kategoriyalar/);
  await screen.findByText('Kategoriyalarni boshqarish');
  return { ...result, value };
}
// Sidebar navigation is async (sections may veto leaving)
const goTo = async (name) => { await act(async () => { fireEvent.click(screen.getByRole('button', { name })); }); };
async function provider() { render(<AdminProvider><Probe /><ShopProbe /></AdminProvider>); await waitFor(() => expect(latest.loading).toBe(false)); }

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); window.history.replaceState({}, '', '/admin');
  // jsdom's async history traversal leaks between tests; Back is simulated explicitly instead
  vi.spyOn(window.history, 'back').mockImplementation(() => {});
  cats = [
    { id: 'c1', name: 'Audit A', image: `${OWN}categories/a.svg`, visible: true, sort_order: 1, created_at: '2026-01-01' },
    { id: 'c2', name: 'Audit B', image: `${OWN}categories/b.svg`, visible: false, sort_order: 2, created_at: '2026-01-02' }
  ];
  products = [{ id: 1, name: 'Product A', category: 'Audit A', visible: true, stock: 2, price: 100 }];
  m.confirm.mockResolvedValue(true);
  m.api.essentialDataAPI.getAll = vi.fn().mockImplementation(async () => ({ products, categories: cats, reviews: [] }));
  m.api.ordersAPI.getAll = vi.fn().mockResolvedValue([]); m.api.usersAPI.getAll = vi.fn().mockResolvedValue([]);
  // A tiny model of the database: committed categories + other references
  db = { categories: cats.map(c => ({ ...c })), refs: new Set() };
  m.api.categoriesAPI.save = vi.fn().mockImplementation(async ({ id, name, image }) => {
    if (!id) { const row = { id: 'new', name, image }; db.categories.push(row); return row; }
    const i = db.categories.findIndex(c => c.id === id);
    db.categories[i] = { ...db.categories[i], name, image };
    return db.categories[i];
  });
  m.api.categoriesAPI.resolveWrite = vi.fn().mockResolvedValue('unknown');
  m.api.categoriesAPI.delete = vi.fn().mockImplementation(async id => { db.categories = db.categories.filter(c => c.id !== id); });
  m.api.categoriesAPI.toggleVisibility = vi.fn().mockImplementation(async (id, visible) => ({ ...cats.find(c => c.id === id), visible }));
  m.api.categoriesAPI.reorder = vi.fn().mockImplementation(async ids => ids.length);
  m.api.categoriesAPI.countProducts = vi.fn().mockResolvedValue(0);
  m.api.storageAPI.deleteImage = vi.fn().mockResolvedValue();
  // Reference status from the model: referenced while a committed category or other row uses it
  m.api.storageAPI.referenceStatus = vi.fn().mockImplementation(async url => ({
    status: db.categories.some(c => c.image === url) || db.refs.has(url) ? 'referenced' : 'unreferenced',
    bucket: 'product-images', path: ownPath(url)
  }));
  m.api.storageAPI.uploadCategoryImage = vi.fn().mockResolvedValue({ url: `${OWN}categories/new.png` });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('CAT-01 product membership', () => {
  test('rename is one atomic RPC call and the renamed filter keeps its products', async () => {
    await provider();
    await act(async () => latest.updateCategory('c1', { name: 'Renamed' }));
    expect(m.api.categoriesAPI.save).toHaveBeenCalledTimes(1);
    expect(m.api.categoriesAPI.save).toHaveBeenCalledWith({ opId: expect.any(String), id: 'c1', name: 'Renamed', image: cats[0].image, expectedName: 'Audit A' });
    expect(latest.products[0].category).toBe('Renamed');
    await act(async () => shop.setSelectedCategory('Renamed'));
    expect(shop.products.map(p => p.id)).toEqual([1]);
  });

  test('a definitive rename failure changes nothing and needs no refresh', async () => {
    await provider();
    m.api.categoriesAPI.save.mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'category_forbidden', definitive: true }));
    await act(async () => { await expect(latest.updateCategory('c1', { name: 'Renamed' })).rejects.toMatchObject({ code: 'category_forbidden' }); });
    expect(m.api.essentialDataAPI.getAll).toHaveBeenCalledTimes(1);
    expect(latest.categories[0].name).toBe('Audit A');
    expect(latest.products[0].category).toBe('Audit A');
    expect(m.audit).not.toHaveBeenCalled();
  });

  test('deleting an occupied category is refused before any write', async () => {
    await provider();
    await act(async () => { await expect(latest.deleteCategory('c1')).rejects.toMatchObject({ code: 'category_in_use', productCount: 1 }); });
    expect(m.api.categoriesAPI.delete).not.toHaveBeenCalled();
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(latest.categories).toHaveLength(2);
  });

  test('server-side product count also blocks deletion', async () => {
    await provider();
    m.api.categoriesAPI.countProducts.mockResolvedValueOnce(3);
    await act(async () => { await expect(latest.deleteCategory('c2')).rejects.toMatchObject({ code: 'category_in_use', productCount: 3 }); });
    expect(m.api.categoriesAPI.delete).not.toHaveBeenCalled();
  });

  test('UI shows the product count and blocks deleting an occupied category', async () => {
    const { value } = await ui();
    expect(card().getByText('1 ta mahsulot')).toBeInTheDocument();
    fireEvent.click(card().getByRole('button', { name: "O'chirish" }));
    await waitFor(() => expect(m.toast.warning).toHaveBeenCalledWith(expect.stringContaining('1 ta mahsulot')));
    expect(m.confirm).not.toHaveBeenCalled();
    expect(value.deleteCategory).not.toHaveBeenCalled();
  });
});

describe('CAT-02 / CAT-13 image cleanup', () => {
  test('failed category deletion keeps its stored image', async () => {
    await provider();
    m.api.categoriesAPI.delete.mockRejectedValueOnce(dbError('Delete denied'));
    await act(async () => { await expect(latest.deleteCategory('c2')).rejects.toThrow('Delete denied'); });
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(latest.categories).toHaveLength(2);
  });

  test('successful deletion removes an unreferenced owned image after the record is gone', async () => {
    await provider();
    await act(async () => latest.deleteCategory('c2'));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/b.svg'));
    expect(m.api.categoriesAPI.delete.mock.invocationCallOrder[0]).toBeLessThan(m.api.storageAPI.deleteImage.mock.invocationCallOrder[0]);
  });

  test('a shared image still referenced elsewhere is kept', async () => {
    cats[0].image = cats[1].image; products = [];
    m.api.storageAPI.referenceStatus.mockResolvedValue({ status: 'referenced', bucket: 'product-images', path: 'categories/b.svg' });
    await provider();
    await act(async () => latest.deleteCategory('c2'));
    await waitFor(() => expect(m.api.storageAPI.referenceStatus).toHaveBeenCalledWith(cats[1].image));
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(latest.categories[0].image).toBe(cats[1].image);
  });

  test('foreign URLs that merely contain /product-images/ are never deleted', async () => {
    cats[1].image = 'https://elsewhere.test/product-images/b.svg';
    await provider();
    await act(async () => latest.deleteCategory('c2'));
    expect(m.api.storageAPI.referenceStatus).not.toHaveBeenCalled();
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
  });

  test('failed storage cleanup is queued for retry', async () => {
    m.api.storageAPI.deleteImage.mockRejectedValueOnce(new Error('network'));
    await provider();
    await act(async () => latest.deleteCategory('c2'));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('pendingStorageCleanup'))).toEqual([cats[1].image]));
  });

  test('replacing a category image cleans up the old one after the update', async () => {
    await provider();
    await act(async () => latest.updateCategory('c1', { image: `${OWN}categories/replaced.png` }));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/a.svg'));
  });

  test('cancel after a successful upload removes the unused object', async () => {
    const { container } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(`${OWN}categories/new.png`));
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
  });

  test('uploading a second image before saving removes the first draft upload', async () => {
    m.api.storageAPI.uploadCategoryImage
      .mockResolvedValueOnce({ url: `${OWN}categories/first.png` })
      .mockResolvedValueOnce({ url: `${OWN}categories/second.png` });
    const { container } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(`${OWN}categories/first.png`));
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(`${OWN}categories/second.png`));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/first.png'));
  });

  test('saved upload is not cleaned up', async () => {
    const { container, value } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'With upload' } });
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(`${OWN}categories/new.png`));
    submit();
    await waitFor(() => expect(value.addCategory).toHaveBeenCalledWith({ name: 'With upload', image: `${OWN}categories/new.png` }, { opId: expect.any(String) }));
    await waitFor(() => expect(screen.queryByLabelText(/Kategoriya nomi/)).not.toBeInTheDocument());
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
  });
});

describe('CAT-03 Add always starts a fresh draft', () => {
  test('edit then top Add creates instead of updating', async () => {
    const { value } = await ui();
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.click(addButton());
    expect(field()).toHaveValue('');
    fireEvent.change(field(), { target: { value: 'New intended category' } });
    fireEvent.change(imageField(), { target: { value: 'https://example.test/n.png' } });
    submit();
    await waitFor(() => expect(value.addCategory).toHaveBeenCalledWith({ name: 'New intended category', image: 'https://example.test/n.png' }, { opId: expect.any(String) }));
    expect(value.updateCategory).not.toHaveBeenCalled();
  });

  test('cancel edit then Add shows an empty form', async () => {
    await ui();
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    fireEvent.click(addButton());
    expect(field()).toHaveValue('');
    expect(imageField()).toHaveValue('');
    expect(screen.getByRole('heading', { name: "Yangi kategoriya qo'shish" })).toBeInTheDocument();
  });

  test('switching away from a dirty draft asks first and keeps it on cancel', async () => {
    m.confirm.mockResolvedValueOnce(false);
    await ui();
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(field(), { target: { value: 'Edited' } });
    fireEvent.click(addButton());
    await waitFor(() => expect(m.confirm).toHaveBeenCalled());
    expect(field()).toHaveValue('Edited');
  });
});

describe('CAT-04 draft survives parent renders', () => {
  test('sidebar collapse keeps the unsaved draft', async () => {
    await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Unsaved' } });
    fireEvent.click(screen.getByRole('button', { name: "Menyuni yig'ish" }));
    expect(screen.getByDisplayValue('Unsaved')).toBeInTheDocument();
  });

  test('unrelated context refresh keeps the unsaved draft', async () => {
    const { rerender, value } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Unsaved' } });
    rerender(<AdminContext.Provider value={{ ...value, orders: [{ id: 'changed', status: 'pending', total: 0 }] }}><Panel /></AdminContext.Provider>);
    expect(screen.getByDisplayValue('Unsaved')).toBeInTheDocument();
  });
});

describe('CAT-05 upload races', () => {
  test('save is disabled while uploading and the late upload fills the same draft', async () => {
    const d = deferred(); m.api.storageAPI.uploadCategoryImage.mockReturnValue(d.promise);
    const { value, container } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Upload race' } });
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(m.api.storageAPI.uploadCategoryImage).toHaveBeenCalled());
    expect(submitButton()).toBeDisabled();
    submit();
    expect(value.addCategory).not.toHaveBeenCalled();
    await act(async () => d.resolve({ url: `${OWN}categories/late.png` }));
    expect(imageField()).toHaveValue(`${OWN}categories/late.png`);
    expect(submitButton()).toBeEnabled();
    submit();
    await waitFor(() => expect(value.addCategory).toHaveBeenCalledWith({ name: 'Upload race', image: `${OWN}categories/late.png` }, { opId: expect.any(String) }));
  });

  test('upload from canceled category A does not touch category B and is cleaned up', async () => {
    const d = deferred(); m.api.storageAPI.uploadCategoryImage.mockReturnValue(d.promise);
    const { container } = await ui();
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(m.api.storageAPI.uploadCategoryImage).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    fireEvent.click(card('Audit B').getByRole('button', { name: 'Tahrirlash' }));
    await act(async () => d.resolve({ url: `${OWN}categories/from-A.png` }));
    expect(field()).toHaveValue('Audit B');
    expect(imageField()).toHaveValue(cats[1].image);
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/from-A.png'));
  });
});

describe('CAT-06 duplicate submissions', () => {
  test('double submit sends one create request and disables save', async () => {
    const d = deferred(), addCategory = vi.fn().mockReturnValue(d.promise);
    await ui({ addCategory });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Duplicate' } });
    fireEvent.change(imageField(), { target: { value: cats[0].image } });
    submit(); submit();
    expect(addCategory).toHaveBeenCalledTimes(1);
    expect(submitButton()).toBeDisabled();
    await act(async () => d.resolve({}));
  });

  test('an existing name (case/whitespace-insensitive) is rejected before saving', async () => {
    const { value } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: '  audit   a ' } });
    fireEvent.change(imageField(), { target: { value: 'https://example.test/x.png' } });
    submit();
    expect(await screen.findByText('Bunday nomli kategoriya allaqachon mavjud')).toBeInTheDocument();
    expect(value.addCategory).not.toHaveBeenCalled();
  });
});

describe('CAT-07 image is required', () => {
  test('missing image is explained and nothing is submitted', async () => {
    const { value } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'No image' } });
    expect(imageField()).toBeRequired();
    submit();
    expect(await screen.findByText(/Kategoriya rasmini yuklang/)).toBeInTheDocument();
    expect(imageField()).toHaveAttribute('aria-invalid', 'true');
    expect(value.addCategory).not.toHaveBeenCalled();
  });
});

describe('CAT-08 name validation (API)', () => {
  test('save normalizes the name and sends op id + expected name', async () => {
    const real = await vi.importActual('../services/api');
    m.rpc.mockResolvedValue({ data: { id: 'c1', name: 'Audit A' }, error: null });
    await real.categoriesAPI.save({ opId: 'op-1', id: 'c1', name: '  Audit   A  ', image: ' https://x.test/a.svg ', expectedName: 'Old' });
    expect(m.rpc).toHaveBeenCalledWith('admin_save_category', { p_op_id: 'op-1', p_id: 'c1', p_name: 'Audit A', p_image: 'https://x.test/a.svg', p_expected_name: 'Old' });
  });

  test('save rejects a missing image or operation id before calling the server', async () => {
    const real = await vi.importActual('../services/api');
    await expect(real.categoriesAPI.save({ opId: 'op', name: 'Ok', image: '' })).rejects.toThrow(/image/);
    await expect(real.categoriesAPI.save({ name: 'Ok', image: 'x' })).rejects.toMatchObject({ code: 'category_invalid' });
    expect(m.rpc).not.toHaveBeenCalled();
  });

  test.each(['   ', 'X'.repeat(101)])('create and rename apply the same name rules: %s', async name => {
    const real = await vi.importActual('../services/api');
    await expect(real.categoriesAPI.save({ opId: 'op', name, image: 'x' })).rejects.toThrow();
    await expect(real.categoriesAPI.save({ opId: 'op', id: 'c1', name, image: 'x', expectedName: 'Audit A' })).rejects.toThrow();
    expect(m.rpc).not.toHaveBeenCalled();
  });

  test('deleting a missing category is reported as a failure', async () => {
    const real = await vi.importActual('../services/api');
    const b = { delete: () => b, eq: () => b, select: async () => ({ data: [], error: null }) };
    m.from.mockReturnValue(b);
    await expect(real.categoriesAPI.delete('missing')).rejects.toMatchObject({ code: 'category_not_deleted' });
  });

  test('unique-index violation becomes a readable duplicate error', async () => {
    const real = await vi.importActual('../services/api');
    m.rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
    await expect(real.categoriesAPI.save({ opId: 'op', name: 'Dup', image: 'x' })).rejects.toMatchObject({ code: 'category_duplicate' });
  });

  test('name input enforces the max length', async () => {
    await ui(); fireEvent.click(addButton());
    expect(field()).toHaveAttribute('maxLength', '100');
  });
});

describe('CAT-09 shared ordering', () => {
  test('reorder is persisted to the database, not localStorage', async () => {
    await provider();
    await act(async () => latest.reorderCategories([...latest.categories].reverse()));
    expect(m.api.categoriesAPI.reorder).toHaveBeenCalledWith(['c2', 'c1']);
    expect(localStorage.getItem('categoryOrder')).toBeNull();
    expect(latest.categories.map(c => [c.id, c.sort_order])).toEqual([['c2', 1], ['c1', 2]]);
  });

  test('a failed reorder reverts the local order', async () => {
    await provider();
    m.api.categoriesAPI.reorder.mockRejectedValueOnce(dbError('denied'));
    await act(async () => { await expect(latest.reorderCategories([...latest.categories].reverse())).rejects.toThrow('denied'); });
    expect(latest.categories.map(c => c.id)).toEqual(['c1', 'c2']);
  });

  test('loaded categories follow sort_order and ignore a stale local order', async () => {
    cats[0].sort_order = 5;
    localStorage.setItem('categoryOrder', JSON.stringify(['c1', 'c2']));
    await provider();
    expect(latest.categories.map(c => c.id)).toEqual(['c2', 'c1']);
    expect(localStorage.getItem('categoryOrder')).toBeNull();
  });

  test('new category is appended (the database assigns sort_order)', async () => {
    await provider();
    await act(async () => latest.addCategory({ name: 'Added', image: 'https://example.test/a.png' }));
    expect(m.api.categoriesAPI.save).toHaveBeenCalledWith({ opId: expect.any(String), name: 'Added', image: 'https://example.test/a.png' });
    expect(latest.categories.map(c => c.id)).toEqual(['c1', 'c2', 'new']);
  });

  test('UI reports a failed reorder', async () => {
    await ui({ reorderCategories: vi.fn().mockRejectedValue(new Error('x')) });
    fireEvent.click(card().getByRole('button', { name: 'Pastga' }));
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Kategoriyalar tartibini saqlashda xatolik'));
  });
});

describe('CAT-10 audit logging', () => {
  test('create, update, visibility, reorder and delete are logged with old/new data', async () => {
    products = [];
    await provider();
    await act(async () => latest.addCategory({ name: 'Added', image: 'https://example.test/a.png' }));
    await act(async () => latest.updateCategory('c1', { name: 'Renamed' }));
    await act(async () => latest.toggleCategoryVisibility('c1', false));
    await act(async () => latest.reorderCategories([...latest.categories].reverse()));
    await act(async () => latest.deleteCategory('c2'));
    const actions = m.audit.mock.calls.map(([a]) => a.action);
    expect(actions).toEqual(['category.create', 'category.update', 'category.visibility', 'category.reorder', 'category.delete']);
    expect(m.audit.mock.calls[1][0]).toMatchObject({ entityType: 'category', entityId: 'c1', oldData: expect.objectContaining({ name: 'Audit A' }), newData: expect.objectContaining({ name: 'Renamed' }) });
    expect(m.audit.mock.calls[2][0]).toMatchObject({ oldData: { visible: true }, newData: { visible: false } });
    expect(m.audit.mock.calls[4][0]).toMatchObject({ entityId: 'c2', oldData: expect.objectContaining({ name: 'Audit B' }) });
  });

  test('failed mutations are not logged', async () => {
    await provider();
    m.api.categoriesAPI.save.mockRejectedValueOnce(new Error('Denied'));
    await act(async () => { await expect(latest.addCategory({ name: 'X', image: 'x' })).rejects.toThrow(); });
    expect(m.audit).not.toHaveBeenCalled();
  });
});

describe('CAT-11 stale shop selection', () => {
  test('a removed persisted category falls back to All', async () => {
    localStorage.setItem('selectedCategory', JSON.stringify('Removed category'));
    await provider();
    await waitFor(() => expect(shop.selectedCategory).not.toBe('Removed category'));
    expect(shop.products.map(p => p.id)).toEqual([1]);
  });

  test('a valid persisted category is kept', async () => {
    localStorage.setItem('selectedCategory', JSON.stringify('Audit A'));
    await provider();
    expect(shop.selectedCategory).toBe('Audit A');
    expect(shop.products.map(p => p.id)).toEqual([1]);
  });
});

describe('CAT-12 upload restrictions', () => {
  test('a text file is rejected before reaching storage', async () => {
    const { container } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(fileInput(container), { target: { files: [new File(['hello'], 'not-image.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText(/Faqat rasm fayllari/)).toBeInTheDocument();
    expect(m.api.storageAPI.uploadCategoryImage).not.toHaveBeenCalled();
  });

  test('an oversized image is rejected before reaching storage', async () => {
    const { container } = await ui();
    fireEvent.click(addButton());
    const big = png('big.png'); Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 });
    fireEvent.change(fileInput(container), { target: { files: [big] } });
    expect(await screen.findByText(/2 MB/, { selector: '[role=alert]' })).toBeInTheDocument();
    expect(m.api.storageAPI.uploadCategoryImage).not.toHaveBeenCalled();
  });

  test('category rules accept SVG and reject GIF; default rules cap size at 10 MB', () => {
    expect(validateImageFile(new File(['<svg/>'], 'i.svg', { type: 'image/svg+xml' }), IMAGE_UPLOAD_RULES.category)).toBe(true);
    expect(() => validateImageFile(new File(['x'], 'i.gif', { type: 'image/gif' }), IMAGE_UPLOAD_RULES.category)).toThrow();
    const huge = new File(['x'], 'h.jpg', { type: 'image/jpeg' }); Object.defineProperty(huge, 'size', { value: 11 * 1024 * 1024 });
    expect(() => validateImageFile(huge)).toThrow(/10 MB/);
    expect(validateImageFile(new File(['x'], 'p.heic', { type: '' }))).toBe(true);
  });

  test('storageAPI.uploadImage validates before calling storage', async () => {
    const real = await vi.importActual('../services/api');
    await expect(real.storageAPI.uploadImage(new File(['x'], 'x.txt', { type: 'text/plain' }))).rejects.toThrow(/Faqat rasm/);
  });

  test('extractOwnedStoragePath accepts only this project bucket', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', BASE);
    const real = await vi.importActual('../services/api');
    expect(real.extractOwnedStoragePath(`${OWN}categories/a.svg`)).toBe('categories/a.svg');
    expect(real.extractOwnedStoragePath('https://evil.test/storage/v1/object/public/product-images/a.svg')).toBeNull();
    expect(real.extractOwnedStoragePath(`${OWN}../secret`)).toBeNull();
  });
});

describe('CAT-14 preview recovery', () => {
  test('broken preview shows an error state and recovers for a new URL', async () => {
    await ui();
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.error(screen.getByAltText("Ko'rinishi"));
    expect(screen.getByText(/Rasmni ko'rsatib bo'lmadi/)).toBeInTheDocument();
    fireEvent.change(imageField(), { target: { value: 'https://example.test/good.png' } });
    expect(screen.getByAltText("Ko'rinishi")).toBeVisible();
    expect(screen.getByAltText("Ko'rinishi")).toHaveAttribute('src', 'https://example.test/good.png');
  });
});

describe('CAT-15 accessibility', () => {
  test('inputs and close button have accessible names; errors are associated', async () => {
    await ui();
    fireEvent.click(addButton());
    expect(field()).toHaveAccessibleName('Kategoriya nomi *');
    expect(imageField()).toHaveAccessibleName('Rasm URL manzili');
    expect(screen.getByRole('button', { name: 'Formani yopish' })).toBeInTheDocument();
    submit();
    await screen.findByText('Kategoriya nomini kiriting');
    expect(field()).toHaveAccessibleDescription('Kategoriya nomini kiriting');
  });
});

describe('preserved behaviour', () => {
  test('canceled delete does not issue any mutation', async () => {
    m.confirm.mockResolvedValueOnce(false);
    const { value } = await ui();
    fireEvent.click(card('Audit B').getByRole('button', { name: "O'chirish" }));
    await waitFor(() => expect(m.confirm).toHaveBeenCalled());
    expect(value.deleteCategory).not.toHaveBeenCalled();
  });

  test('empty category deletes after confirmation', async () => {
    const { value } = await ui();
    fireEvent.click(card('Audit B').getByRole('button', { name: "O'chirish" }));
    await waitFor(() => expect(value.deleteCategory).toHaveBeenCalledWith('c2'));
    expect(m.toast.success).toHaveBeenCalled();
  });

  test('save failure retains draft and reports error', async () => {
    await ui({ addCategory: vi.fn().mockRejectedValue(new Error('Denied')) });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Preserve me' } });
    fireEvent.change(imageField(), { target: { value: 'https://example.test/p.png' } });
    submit();
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled());
    expect(field()).toHaveValue('Preserve me');
    expect(m.toast.success).not.toHaveBeenCalled();
    expect(submitButton()).toBeEnabled();
  });

  test('upload failure leaves existing image and reports error', async () => {
    m.api.storageAPI.uploadCategoryImage.mockRejectedValueOnce(new Error('Denied'));
    const { container } = await ui();
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled());
    expect(imageField()).toHaveValue(cats[0].image);
  });

  test('editing only sends changed fields', async () => {
    const { value } = await ui();
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(field(), { target: { value: 'Audit A2' } });
    submit();
    await waitFor(() => expect(value.updateCategory).toHaveBeenCalledWith('c1', { name: 'Audit A2' }, { opId: expect.any(String) }));
  });

  test('reorder boundaries disabled and down swaps correct records', async () => {
    const { value } = await ui();
    expect(card().getByRole('button', { name: 'Yuqoriga' })).toBeDisabled();
    expect(card('Audit B').getByRole('button', { name: 'Pastga' })).toBeDisabled();
    fireEvent.click(card().getByRole('button', { name: 'Pastga' }));
    expect(value.reorderCategories).toHaveBeenCalledWith([cats[1], cats[0]]);
    await waitFor(() => expect(card().getByRole('button', { name: 'Pastga' })).toBeEnabled());
  });

  test('visibility toggles correct inverse for visible and hidden categories', async () => {
    const { value } = await ui();
    fireEvent.click(card().getByRole('button', { name: 'Yashirish' }));
    fireEvent.click(card('Audit B').getByRole('button', { name: "Ko'rsatish" }));
    await waitFor(() => expect(value.toggleCategoryVisibility).toHaveBeenCalledWith('c1', false));
    expect(value.toggleCategoryVisibility).toHaveBeenCalledWith('c2', true);
  });

  test('visibility API failure leaves local visibility unchanged', async () => {
    await provider();
    m.api.categoriesAPI.toggleVisibility.mockRejectedValueOnce(dbError('Denied'));
    await act(async () => { await expect(latest.toggleCategoryVisibility('c1', false)).rejects.toThrow('Denied'); });
    expect(latest.categories[0].visible).toBe(true);
  });

  test('empty state supports creating first category and HTML name is escaped', async () => {
    cats = []; await ui();
    fireEvent.click(screen.getByRole('button', { name: "Birinchi kategoriyani qo'shish" }));
    expect(field()).toBeInTheDocument();
    fireEvent.change(field(), { target: { value: '<script>alert(1)</script>' } });
    expect(document.querySelector('script')).toBeNull();
  });

  test('customer navigation excludes hidden categories and passes selected name', () => {
    const onNavigate = vi.fn();
    render(<AdminContext.Provider value={{ categories: cats }}><CategoryNavBar onNavigate={onNavigate} /></AdminContext.Provider>);
    expect(screen.queryByText('Audit B')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Audit A'));
    expect(onNavigate).toHaveBeenCalledWith('shop', { category: 'Audit A' });
  });

  test('category names render as escaped card text', async () => {
    cats[0].name = '<img src=x onerror=alert(1)>'; await ui();
    expect(screen.getByRole('heading', { name: cats[0].name })).toHaveTextContent(cats[0].name);
    expect(document.querySelector('img[onerror]')).toBeNull();
  });

  test('category write API error propagates without changing local list', async () => {
    await provider();
    m.api.categoriesAPI.save.mockRejectedValueOnce(dbError('Denied')).mockRejectedValueOnce(dbError('Denied'));
    await act(async () => {
      await expect(latest.addCategory({ name: 'Added', image: 'x' })).rejects.toThrow('Denied');
      await expect(latest.updateCategory('c1', { name: 'No' })).rejects.toThrow('Denied');
    });
    expect(latest.categories).toEqual(cats);
  });
});

// ===========================================================================
// Independent review findings (audit-reports/2026-10-25-categories/claude-review)
// The saved reproductions asserted defects; these assert the corrected behaviour.
// Database-level behaviour (R1, R2, R5, R6) is tested in supabase-tests/.
// ===========================================================================

describe('R3 leaving the section with a dirty draft', () => {
  const dirtyAdd = async () => {
    await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Unsaved category' } });
  };

  test('sidebar navigation asks first; cancelling keeps the draft and the section', async () => {
    m.confirm.mockResolvedValueOnce(false);
    await dirtyAdd();
    await goTo(/^Mahsulotlar/);
    expect(m.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Saqlanmagan o'zgarishlar" }));
    expect(screen.getByDisplayValue('Unsaved category')).toBeInTheDocument();
    expect(screen.getByText('Kategoriyalarni boshqarish')).toBeInTheDocument();
  });

  test('confirming leaves the section and discards the draft', async () => {
    await dirtyAdd();
    await goTo(/^Mahsulotlar/);
    expect(m.confirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Kategoriyalarni boshqarish')).not.toBeInTheDocument();
    await goTo(/^Kategoriyalar/);
    expect(screen.queryByDisplayValue('Unsaved category')).not.toBeInTheDocument();
  });

  test('logout is guarded the same way', async () => {
    const onLogout = vi.fn();
    m.confirm.mockResolvedValueOnce(false);
    await ui({ onLogout });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Unsaved category' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Chiqish' })); });
    expect(onLogout).not.toHaveBeenCalled();
    m.confirm.mockResolvedValueOnce(true);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Chiqish' })); });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  test('a clean form or no form leaves without asking', async () => {
    await ui();
    fireEvent.click(addButton());
    await goTo(/^Mahsulotlar/);
    expect(m.confirm).not.toHaveBeenCalled();
    expect(screen.queryByText('Kategoriyalarni boshqarish')).not.toBeInTheDocument();
  });

  test('a running upload counts as unsaved work', async () => {
    m.api.storageAPI.uploadCategoryImage.mockReturnValue(deferred().promise);
    m.confirm.mockResolvedValueOnce(false);
    const { container } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await goTo(/^Mahsulotlar/);
    expect(m.confirm).toHaveBeenCalled();
    expect(screen.getByText('Kategoriyalarni boshqarish')).toBeInTheDocument();
  });

  test('leaving is refused while a save is in flight', async () => {
    const d = deferred();
    await ui({ addCategory: vi.fn().mockReturnValue(d.promise) });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Saving' } });
    fireEvent.change(imageField(), { target: { value: 'https://example.test/s.png' } });
    submit();
    await goTo(/^Mahsulotlar/);
    expect(m.toast.info).toHaveBeenCalledWith('Kategoriya saqlanmoqda, biroz kuting');
    expect(screen.getByText('Kategoriyalarni boshqarish')).toBeInTheDocument();
    await act(async () => d.resolve({}));
  });

  test('explicit Cancel and Close discard directly (no confirmation)', async () => {
    await dirtyAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    expect(screen.queryByDisplayValue('Unsaved category')).not.toBeInTheDocument();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Again' } });
    fireEvent.click(screen.getByRole('button', { name: 'Formani yopish' }));
    expect(screen.queryByDisplayValue('Again')).not.toBeInTheDocument();
    expect(m.confirm).not.toHaveBeenCalled();
  });
});

describe('R4 unmount cleanup', () => {
  test('a completed draft upload is cleaned up when leaving the section', async () => {
    const { container } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(`${OWN}categories/new.png`));
    await goTo(/^Mahsulotlar/);
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
    expect(m.api.storageAPI.referenceStatus).toHaveBeenCalledWith(`${OWN}categories/new.png`);
  });

  test('an upload that finishes after leaving is treated as stale and cleaned up', async () => {
    const d = deferred(); m.api.storageAPI.uploadCategoryImage.mockReturnValue(d.promise);
    const { container } = await ui();
    fireEvent.click(addButton());
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await goTo(/^Mahsulotlar/);
    await act(async () => d.resolve({ url: `${OWN}categories/late.png` }));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/late.png'));
    expect(m.toast.error).not.toHaveBeenCalled();
  });

  test('an image used by a save in flight survives unmount and is kept when the save succeeds', async () => {
    const d = deferred();
    const { container, unmount } = await ui({ addCategory: vi.fn().mockReturnValue(d.promise) });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'In flight' } });
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(`${OWN}categories/new.png`));
    submit();
    unmount();
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    db.refs.add(`${OWN}categories/new.png`); // the save committed
    await act(async () => d.resolve({ id: 'new' }));
    await waitFor(() => expect(m.api.storageAPI.referenceStatus).toHaveBeenCalledWith(`${OWN}categories/new.png`));
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('categoryWriteHolds'))).toEqual([]);
  });

  test('if that in-flight save fails after unmount, its unused upload is cleaned up', async () => {
    const d = deferred();
    const { container, unmount } = await ui({ addCategory: vi.fn().mockReturnValue(d.promise) });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'In flight' } });
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(`${OWN}categories/new.png`));
    submit();
    unmount();
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    await act(async () => d.reject(dbError('denied')));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
  });
});

describe('R5 atomic rename and ambiguous outcomes', () => {
  test('no compensating rollback: a network failure refreshes authoritative state', async () => {
    await provider();
    // The server committed the rename, but the response was lost
    // ...and the outcome cannot be resolved yet either (resolveWrite → 'unknown')
    m.api.categoriesAPI.save.mockImplementationOnce(async () => {
      cats = [{ ...cats[0], name: 'Renamed' }, cats[1]];
      products = [{ ...products[0], category: 'Renamed' }];
      throw new TypeError('Failed to fetch');
    });
    await act(async () => { await expect(latest.updateCategory('c1', { name: 'Renamed' })).rejects.toMatchObject({ code: 'outcome_unknown', refreshed: true }); });
    expect(m.api.categoriesAPI.save).toHaveBeenCalledTimes(1);
    expect(m.api.categoriesAPI.resolveWrite).toHaveBeenCalledWith(m.api.categoriesAPI.save.mock.calls[0][0].opId);
    expect(m.api.essentialDataAPI.getAll).toHaveBeenCalledTimes(2);
    expect(latest.categories[0].name).toBe('Renamed');
    expect(latest.products[0].category).toBe('Renamed');
    expect(m.audit).not.toHaveBeenCalled();
  });

  test('a stale edit is rejected and the client refreshes', async () => {
    await provider();
    m.api.categoriesAPI.save.mockRejectedValueOnce(Object.assign(new Error('stale'), { code: 'category_stale', definitive: true }));
    await act(async () => { await expect(latest.updateCategory('c1', { name: 'X' })).rejects.toMatchObject({ code: 'category_stale' }); });
    expect(m.api.essentialDataAPI.getAll).toHaveBeenCalledTimes(2);
  });

  test('UI reports the uncertain outcome instead of a generic error', async () => {
    const err = Object.assign(new Error('Saqlash natijasi aniq emas.'), { code: 'outcome_unknown' });
    await ui({ updateCategory: vi.fn().mockRejectedValue(err) });
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(field(), { target: { value: 'Renamed' } });
    submit();
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Saqlash natijasi aniq emas.'));
  });

  test('API: missing RPC is reported as "migration required" (fails closed)', async () => {
    const real = await vi.importActual('../services/api');
    m.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    await expect(real.categoriesAPI.save({ opId: 'op', id: 'c1', name: 'New', image: 'x', expectedName: 'Old' })).rejects.toMatchObject({ code: 'migration_required', definitive: true });
  });

  test('API: server error codes are definitive, transport errors are not', async () => {
    const real = await vi.importActual('../services/api');
    expect(real.isDefinitiveError({ code: '42501' })).toBe(true);
    expect(real.isDefinitiveError({ code: 'PGRST116' })).toBe(true);
    expect(real.isDefinitiveError(new TypeError('Failed to fetch'))).toBe(false);
    expect(real.isDefinitiveError({ code: '', message: 'FetchError' })).toBe(false);
  });
});

describe('R6 reorder must be confirmed', () => {
  test('a failed reorder reverts, refreshes when uncertain, and is not logged', async () => {
    await provider();
    m.api.categoriesAPI.reorder.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await act(async () => { await expect(latest.reorderCategories([...latest.categories].reverse())).rejects.toMatchObject({ code: 'outcome_unknown' }); });
    expect(latest.categories.map(c => c.id)).toEqual(['c1', 'c2']);
    expect(m.api.essentialDataAPI.getAll).toHaveBeenCalledTimes(2);
    expect(m.audit).not.toHaveBeenCalled();
  });

  test('API: the RPC must report every row updated', async () => {
    const real = await vi.importActual('../services/api');
    m.rpc.mockResolvedValue({ data: 0, error: null });
    await expect(real.categoriesAPI.reorder(['c2', 'c1'])).rejects.toMatchObject({ code: 'outcome_unknown', definitive: false });
    m.rpc.mockResolvedValue({ data: null, error: { code: 'PT409', message: 'category_order_stale: list has 1 ids' } });
    await expect(real.categoriesAPI.reorder(['c2', 'c1'])).rejects.toMatchObject({ code: 'category_stale' });
    m.rpc.mockResolvedValue({ data: 2, error: null });
    await expect(real.categoriesAPI.reorder(['c2', 'c1'])).resolves.toBe(2);
  });
});

describe('R7 / R2 cleanup outcomes', () => {
  const url = `${OWN}categories/retry.png`;
  const queue = () => JSON.parse(localStorage.getItem('pendingStorageCleanup') || '[]');
  const cleanup = () => import('../utils/storageCleanup');

  test('an unknown reference status keeps the file and the retry entry', async () => {
    localStorage.setItem('pendingStorageCleanup', JSON.stringify([url]));
    m.api.storageAPI.referenceStatus.mockResolvedValue({ status: 'unknown', bucket: null, path: null });
    await (await cleanup()).retryPendingCleanups();
    expect(queue()).toEqual([url]);
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
  });

  test('a definitive "referenced" keeps the file and clears the entry', async () => {
    localStorage.setItem('pendingStorageCleanup', JSON.stringify([url]));
    m.api.storageAPI.referenceStatus.mockResolvedValue({ status: 'referenced', bucket: 'product-images', path: 'categories/retry.png' });
    await (await cleanup()).retryPendingCleanups();
    expect(queue()).toEqual([]);
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
  });

  test('"unreferenced" deletes and clears; a delete failure stays queued', async () => {
    localStorage.setItem('pendingStorageCleanup', JSON.stringify([url]));
    m.api.storageAPI.deleteImage.mockRejectedValueOnce(new Error('network'));
    const { retryPendingCleanups } = await cleanup();
    await retryPendingCleanups();
    expect(queue()).toEqual([url]);
    await retryPendingCleanups();
    expect(m.api.storageAPI.deleteImage).toHaveBeenLastCalledWith('categories/retry.png');
    expect(queue()).toEqual([]);
  });

  test('a status for a different canonical object is treated as unknown', async () => {
    m.api.storageAPI.referenceStatus.mockResolvedValue({ status: 'unreferenced', bucket: 'product-images', path: 'categories/other.png' });
    expect(await (await cleanup()).cleanupUnusedImage(url)).toBe('unknown');
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(queue()).toEqual([url]);
  });

  test('API: referenceStatus never reports "unreferenced" on errors or odd answers', async () => {
    const real = await vi.importActual('../services/api');
    m.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } });
    expect((await real.storageAPI.referenceStatus(url)).status).toBe('unknown');
    m.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect((await real.storageAPI.referenceStatus(url)).status).toBe('unknown');
    m.rpc.mockResolvedValueOnce({ data: true, error: null });
    expect((await real.storageAPI.referenceStatus(url)).status).toBe('unknown');
    m.rpc.mockResolvedValueOnce({ data: { status: 'unreferenced', bucket: 'product-images', path: 'categories/retry.png' }, error: null });
    expect(await real.storageAPI.referenceStatus(url)).toEqual({ status: 'unreferenced', bucket: 'product-images', path: 'categories/retry.png' });
  });

  test('R2 client path matches the database canonical form (query/encoding ignored)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', BASE);
    const real = await vi.importActual('../services/api');
    expect(real.extractOwnedStoragePath(`${OWN}shared/my%20photo.png?download=2#x`)).toBe('shared/my photo.png');
    expect(real.extractOwnedStoragePath(`${OWN}bad%E0%A4.png`)).toBeNull();
  });
});

// ===========================================================================
// Second review (audit-reports/2026-10-25-categories/claude-review-2)
// ===========================================================================

describe('V2-01 uncertain saves hold their images until the outcome is known', () => {
  const NEW = `${OWN}categories/new.png`;
  const holds = () => JSON.parse(localStorage.getItem('categoryWriteHolds') || '[]');
  const unknown = () => Object.assign(new Error('Connection lost while server is committing'), { code: 'outcome_unknown', definitive: false });
  const startUploadAndSave = async (addCategory) => {
    const r = await ui({ addCategory });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Still committing' } });
    fireEvent.change(fileInput(r.container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(NEW));
    await act(async () => { submit(); });
    return r;
  };

  test('outcome_unknown after unmount does NOT delete the upload (reviewer reproduction)', async () => {
    const d = deferred();
    const { unmount } = await startUploadAndSave(vi.fn().mockReturnValue(d.promise));
    unmount();
    await act(async () => d.reject(unknown()));
    await act(async () => {});
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(holds()).toEqual([expect.objectContaining({ urls: expect.arrayContaining([NEW]) })]);
  });

  test('outcome_unknown, then Cancel: the held image survives; a later "aborted" releases it for cleanup', async () => {
    await startUploadAndSave(vi.fn().mockRejectedValue(unknown()));
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Connection lost while server is committing'));
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    await act(async () => {});
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(holds()).toHaveLength(1);

    m.api.categoriesAPI.resolveWrite.mockResolvedValue('aborted');
    const { resolvePendingWrites } = await import('../utils/storageCleanup');
    await resolvePendingWrites();
    expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png');
    expect(holds()).toEqual([]);
  });

  test('eventual commit: a read that saw "unreferenced" during the save cannot delete; after commit the image is kept', async () => {
    const d = deferred();
    const { unmount } = await startUploadAndSave(vi.fn().mockReturnValue(d.promise));
    unmount();
    // While the save is pending the database does not see the reference yet…
    const { cleanupUnusedImage, resolvePendingWrites } = await import('../utils/storageCleanup');
    expect(await cleanupUnusedImage(NEW)).toBe('held');
    await act(async () => d.reject(unknown()));
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    // …later the transaction commits and resolution says so
    db.refs.add(NEW);
    m.api.categoriesAPI.resolveWrite.mockResolvedValue('committed');
    await resolvePendingWrites();
    expect(m.api.storageAPI.referenceStatus).toHaveBeenCalledWith(NEW);
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(holds()).toEqual([]);
  });

  test('holds survive a reload and are resolved when the section opens again', async () => {
    localStorage.setItem('categoryWriteHolds', JSON.stringify([{ opId: 'op-old', urls: [NEW], createdAt: '2026-10-25T00:00:00Z' }]));
    localStorage.setItem('pendingStorageCleanup', JSON.stringify([NEW]));
    const first = await ui();
    await waitFor(() => expect(m.api.categoriesAPI.resolveWrite).toHaveBeenCalledWith('op-old'));
    await act(async () => {});
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled(); // still unknown → held, even from the retry queue
    expect(holds()).toHaveLength(1);
    first.unmount();

    m.api.categoriesAPI.resolveWrite.mockResolvedValue('aborted');
    await ui();
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
    expect(holds()).toEqual([]);
  });

  test('a definitive failure after unmount still cleans up normally', async () => {
    const d = deferred();
    const { unmount } = await startUploadAndSave(vi.fn().mockReturnValue(d.promise));
    unmount();
    await act(async () => d.reject(dbError('denied')));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
    expect(holds()).toEqual([]);
  });

  test('a definitive failure with the form open keeps the upload in the draft (no delete, no hold)', async () => {
    await startUploadAndSave(vi.fn().mockRejectedValue(dbError('denied')));
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled());
    await act(async () => {});
    expect(imageField()).toHaveValue(NEW);
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(holds()).toEqual([]);
  });

  test('replacing an image: the old image is cleaned only after the save is known to have committed', async () => {
    const d = deferred();
    const { container } = await ui({ updateCategory: vi.fn().mockReturnValue(d.promise) });
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(NEW));
    submit();
    const { cleanupUnusedImage } = await import('../utils/storageCleanup');
    expect(await cleanupUnusedImage(cats[0].image)).toBe('held');
    db.categories[0].image = NEW; // committed
    await act(async () => d.resolve({}));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/a.svg'));
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalledWith('categories/new.png');
  });

  describe('context: resolving the outcome of a lost response', () => {
    const lost = () => { throw new TypeError('Failed to fetch'); };

    test('committed → success from refreshed data, audit-logged', async () => {
      await provider();
      m.api.categoriesAPI.save.mockImplementationOnce(async ({ name, image }) => {
        cats = [...cats, { id: 'c9', name, image }];
        lost();
      });
      m.api.categoriesAPI.resolveWrite.mockResolvedValueOnce('committed');
      let result;
      await act(async () => { result = await latest.addCategory({ name: 'Late', image: 'https://example.test/l.png' }, { opId: 'op-9' }); });
      expect(m.api.categoriesAPI.resolveWrite).toHaveBeenCalledWith('op-9');
      expect(result).toMatchObject({ id: 'c9', name: 'Late' });
      expect(latest.categories.map(c => c.id)).toContain('c9');
      expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'category.create', entityId: 'c9' }));
    });

    test('aborted → definitive "not saved", nothing logged', async () => {
      await provider();
      m.api.categoriesAPI.save.mockImplementationOnce(async () => lost());
      m.api.categoriesAPI.resolveWrite.mockResolvedValueOnce('aborted');
      await act(async () => { await expect(latest.addCategory({ name: 'Lost', image: 'x' })).rejects.toMatchObject({ code: 'category_not_saved', definitive: true }); });
      expect(m.audit).not.toHaveBeenCalled();
      expect(latest.categories).toHaveLength(2);
    });
  });

  test('API: resolveWrite only reports committed/aborted from the server, else unknown', async () => {
    const real = await vi.importActual('../services/api');
    m.rpc.mockResolvedValueOnce({ data: 'committed', error: null });
    expect(await real.categoriesAPI.resolveWrite('op')).toBe('committed');
    m.rpc.mockResolvedValueOnce({ data: null, error: { code: '57014', message: 'statement timeout' } });
    expect(await real.categoriesAPI.resolveWrite('op')).toBe('unknown');
    m.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await real.categoriesAPI.resolveWrite('op')).toBe('unknown');
    m.rpc.mockResolvedValueOnce({ data: 'maybe', error: null });
    expect(await real.categoriesAPI.resolveWrite('op')).toBe('unknown');
  });

  test('API: a storage remove that removed nothing is reported (policy refusal or missing object)', async () => {
    const real = await vi.importActual('../services/api');
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const { supabase } = await import('../lib/supabase');
    supabase.storage = { from: () => ({ remove }) };
    await expect(real.storageAPI.deleteImage('categories/x.png')).rejects.toMatchObject({ code: 'storage_not_removed' });
    delete supabase.storage;
  });
});

describe('V2-02 browser exits use the same unsaved-work rule', () => {
  const unload = () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
  const MARK = '__adminUnsavedGuard';

  test('unchanged Edit with an upload in progress guards unload (reviewer reproduction)', async () => {
    const d = deferred(); m.api.storageAPI.uploadCategoryImage.mockReturnValue(d.promise);
    const { container } = await ui();
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    expect(unload()).toBe(false);
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    expect(unload()).toBe(true);
    await act(async () => d.resolve({ url: `${OWN}categories/pending.png` }));
    expect(unload()).toBe(true); // now the image differs: dirty
  });

  test('dirty draft and a running save guard unload; a clean form does not', async () => {
    const d = deferred();
    await ui({ addCategory: vi.fn().mockReturnValue(d.promise) });
    fireEvent.click(addButton());
    expect(unload()).toBe(false);
    fireEvent.change(field(), { target: { value: 'Dirty' } });
    expect(unload()).toBe(true);
    fireEvent.change(imageField(), { target: { value: 'https://example.test/s.png' } });
    submit();
    expect(unload()).toBe(true);
    await act(async () => d.resolve({}));
    expect(unload()).toBe(false);
  });

  // What the browser does on Back from our sentinel: the previous entry
  // (same URL, original state) becomes current and popstate fires.
  const pressBack = async () => {
    const { [MARK]: _, ...original } = window.history.state || {};
    window.history.replaceState(original, '', window.location.pathname);
    await act(async () => { window.dispatchEvent(new PopStateEvent('popstate', { state: original })); });
  };

  test('unsaved work pushes a same-URL history sentinel', async () => {
    await ui();
    fireEvent.click(addButton());
    expect(window.history.state?.[MARK]).toBeUndefined();
    fireEvent.change(field(), { target: { value: 'Keep me' } });
    expect(window.history.state?.[MARK]).toBe(true);
    expect(window.location.pathname).toBe('/admin');
  });

  test('browser Back with unsaved work asks; cancelling keeps the route and the draft', async () => {
    m.confirm.mockResolvedValueOnce(false);
    await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Keep me' } });
    await pressBack();
    expect(m.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Saqlanmagan o'zgarishlar" }));
    expect(window.history.state?.[MARK]).toBe(true); // sentinel pushed again
    expect(window.history.back).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/admin');
    expect(screen.getByDisplayValue('Keep me')).toBeInTheDocument();
  });

  test('browser Back confirmed really goes back, without a second prompt', async () => {
    await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Leave me' } });
    await pressBack();
    expect(m.confirm).toHaveBeenCalledTimes(1);
    expect(window.history.back).toHaveBeenCalledTimes(1);
    expect(unload()).toBe(false); // leaving: no beforeunload prompt either
    await act(async () => { window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); });
    expect(m.confirm).toHaveBeenCalledTimes(1);
  });

  test('browser Back while saving is refused without asking', async () => {
    const d = deferred();
    await ui({ addCategory: vi.fn().mockReturnValue(d.promise) });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Saving' } });
    fireEvent.change(imageField(), { target: { value: 'https://example.test/s.png' } });
    submit();
    await pressBack();
    expect(m.toast.info).toHaveBeenCalledWith('Kategoriya saqlanmoqda, biroz kuting');
    expect(m.confirm).not.toHaveBeenCalled();
    expect(window.history.state?.[MARK]).toBe(true);
    await act(async () => d.resolve({}));
  });

  test('without unsaved work Back is not intercepted', async () => {
    await ui();
    fireEvent.click(addButton());
    await pressBack();
    expect(m.confirm).not.toHaveBeenCalled();
    expect(window.history.state?.[MARK]).toBeUndefined();
  });

  test('the history sentinel is removed once the work is saved or discarded', async () => {
    await ui();
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Temp' } });
    expect(window.history.state?.[MARK]).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    expect(window.history.back).toHaveBeenCalledTimes(1);
    expect(m.confirm).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Third review (audit-reports/2026-10-25-categories/claude-review-3)
// V3-01: resolving an earlier save must not delete images the open form uses
// ===========================================================================

describe('V3-01 operation holds vs. images owned by the live draft', () => {
  const NEW = `${OWN}categories/new.png`;
  const holds = () => JSON.parse(localStorage.getItem('categoryWriteHolds') || '[]');
  const unknownError = () => Object.assign(new Error('Save outcome remains unknown'), { code: 'outcome_unknown', definitive: false });
  const ABORTED = /Oldingi saqlash amalga oshmadi/;

  // Open Add, upload, submit; the save's outcome stays unknown and the
  // background resolver is pending until the test resolves it.
  const uncertainSave = async (addCategory) => {
    const resolveLater = deferred();
    m.api.categoriesAPI.resolveWrite.mockReturnValue(resolveLater.promise);
    const r = await ui({ addCategory });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Retry category' } });
    fireEvent.change(fileInput(r.container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(NEW));
    await act(async () => { submit(); });
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Save outcome remains unknown'));
    return { ...r, resolveLater };
  };

  test('unknown → aborted with the form open: image survives, form is told, retry saves it (reviewer reproduction)', async () => {
    const addCategory = vi.fn()
      .mockRejectedValueOnce(unknownError())
      .mockImplementationOnce(async c => { db.refs.add(c.image); return { id: 'new', ...c }; });
    const { resolveLater } = await uncertainSave(addCategory);
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();

    await act(async () => resolveLater.resolve('aborted'));
    await waitFor(() => expect(m.toast.warning).toHaveBeenCalledWith(expect.stringMatching(ABORTED)));
    expect(screen.getByRole('status')).toHaveTextContent(ABORTED);
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(holds()).toEqual([]); // operation hold released…
    expect(field()).toHaveValue('Retry category'); // …draft and image kept
    expect(imageField()).toHaveValue(NEW);

    // Retry: the image still exists and is saved; it is not cleaned up afterwards
    m.api.categoriesAPI.resolveWrite.mockResolvedValue('unknown');
    await act(async () => { submit(); });
    await waitFor(() => expect(addCategory).toHaveBeenCalledTimes(2));
    expect(addCategory.mock.calls[1][0]).toEqual({ name: 'Retry category', image: NEW });
    await waitFor(() => expect(screen.queryByLabelText(/Kategoriya nomi/)).not.toBeInTheDocument());
    await act(async () => {});
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(holds()).toEqual([]);
  });

  test.each([
    ['Cancel', () => fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }))],
    ['Close', () => fireEvent.click(screen.getByRole('button', { name: 'Formani yopish' }))]
  ])('after an aborted resolution, %s cleans up the unused image', async (_, discard) => {
    const { resolveLater } = await uncertainSave(vi.fn().mockRejectedValue(unknownError()));
    await act(async () => resolveLater.resolve('aborted'));
    await waitFor(() => expect(m.toast.warning).toHaveBeenCalled());
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    discard();
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
  });

  test('after an aborted resolution, unmount cleans up the unused image', async () => {
    const { resolveLater, unmount } = await uncertainSave(vi.fn().mockRejectedValue(unknownError()));
    await act(async () => resolveLater.resolve('aborted'));
    await waitFor(() => expect(m.toast.warning).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
  });

  test('replacing the image after an aborted resolution cleans up the old upload, keeps the new one', async () => {
    const { resolveLater, container } = await uncertainSave(vi.fn().mockRejectedValue(unknownError()));
    await act(async () => resolveLater.resolve('aborted'));
    await waitFor(() => expect(m.toast.warning).toHaveBeenCalled());
    m.api.storageAPI.uploadCategoryImage.mockResolvedValueOnce({ url: `${OWN}categories/second.png` });
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    await waitFor(() => expect(imageField()).toHaveValue(`${OWN}categories/second.png`));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalledWith('categories/second.png');
  });

  test('draft discarded before a later abort resolution: cleanup still happens on resolution', async () => {
    const { resolveLater } = await uncertainSave(vi.fn().mockRejectedValue(unknownError()));
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    await act(async () => {});
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled(); // still held
    await act(async () => resolveLater.resolve('aborted'));
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
    expect(holds()).toEqual([]);
    expect(m.toast.warning).not.toHaveBeenCalled(); // no form to notify
  });

  test('eventual commit with the form unchanged: image stays protected, form closes as saved', async () => {
    const { resolveLater } = await uncertainSave(vi.fn().mockRejectedValue(unknownError()));
    db.refs.add(NEW); // the save committed on the server
    await act(async () => resolveLater.resolve('committed'));
    await waitFor(() => expect(m.toast.success).toHaveBeenCalledWith('Oldingi saqlash muvaffaqiyatli yakunlangan'));
    await waitFor(() => expect(screen.queryByLabelText(/Kategoriya nomi/)).not.toBeInTheDocument());
    await act(async () => {});
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
    expect(holds()).toEqual([]);
  });

  test('eventual commit after the form was edited: the form stays open with a notice, nothing deleted', async () => {
    const { resolveLater } = await uncertainSave(vi.fn().mockRejectedValue(unknownError()));
    fireEvent.change(field(), { target: { value: 'Edited after' } });
    db.refs.add(NEW);
    await act(async () => resolveLater.resolve('committed'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/serverda bajarilgan/));
    expect(field()).toHaveValue('Edited after');
    expect(m.api.storageAPI.deleteImage).not.toHaveBeenCalled();
  });

  test('unit: draft-owned images are skipped by cleanup until ownership ends', async () => {
    const { setDraftImages, cleanupUnusedImage } = await import('../utils/storageCleanup');
    setDraftImages('owner-1', [NEW]);
    expect(await cleanupUnusedImage(NEW)).toBe('in_draft');
    setDraftImages('owner-1', []);
    expect(await cleanupUnusedImage(NEW)).toBe('deleted');
  });

  test('reload recovery still cleans up when no live draft owns the image', async () => {
    localStorage.setItem('categoryWriteHolds', JSON.stringify([{ opId: 'op-old', urls: [NEW], createdAt: '2026-10-25T00:00:00Z' }]));
    m.api.categoriesAPI.resolveWrite.mockResolvedValue('aborted');
    await ui();
    await waitFor(() => expect(m.api.storageAPI.deleteImage).toHaveBeenCalledWith('categories/new.png'));
    expect(holds()).toEqual([]);
  });
});

// ===========================================================================
// Fourth review (audit-reports/2026-10-25-categories/claude-review-4)
// V4-01: a recovered commit must become the open draft's saved baseline
// ===========================================================================

describe('V4-01 recovered commits rebase the open draft', () => {
  const unknownError = () => Object.assign(new Error('Unknown'), { code: 'outcome_unknown', definitive: false });
  const unload = () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };

  // updateCategory: first call's outcome is unknown (but it commits on the
  // server); later calls persist to the db model like the real RPC would.
  const editSetup = async ({ refreshCatalog } = {}) => {
    const resolveLater = deferred();
    m.api.categoriesAPI.resolveWrite.mockReturnValue(resolveLater.promise);
    const updateCategory = vi.fn()
      .mockRejectedValueOnce(unknownError())
      .mockImplementation(async (id, u) => {
        const i = db.categories.findIndex(c => c.id === id);
        db.categories[i] = { ...db.categories[i], ...u };
        return db.categories[i];
      });
    const refresh = refreshCatalog || vi.fn(async () => ({ products, categories: db.categories.map(c => ({ ...c })) }));
    const r = await ui({ updateCategory, refreshCatalog: refresh });
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    return { ...r, updateCategory, refresh, resolveLater };
  };
  // Submit, get "unknown", then let the server have committed `committed`
  const submitUncertain = async (committed) => {
    await act(async () => { submit(); });
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Unknown'));
    db.categories[0] = { ...db.categories[0], ...committed };
  };
  const confirmCommitted = async (resolveLater) => {
    await act(async () => resolveLater.resolve('committed'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/serverda bajarilgan/));
  };
  const saveAndClose = async () => {
    await act(async () => { submit(); });
    await waitFor(() => expect(screen.queryByLabelText(/Kategoriya nomi/)).not.toBeInTheDocument());
  };

  test('name A → submitted B → later A: saving persists A (reviewer reproduction)', async () => {
    const { updateCategory, refresh, resolveLater } = await editSetup();
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await submitUncertain({ name: 'Committed B' });
    fireEvent.change(field(), { target: { value: 'Audit A' } });
    await confirmCommitted(resolveLater);
    expect(refresh).toHaveBeenCalled();
    expect(field()).toHaveValue('Audit A');
    expect(unload()).toBe(true); // dirty against the committed baseline
    await saveAndClose();
    expect(updateCategory).toHaveBeenCalledTimes(2);
    expect(updateCategory.mock.calls[1]).toEqual(['c1', { name: 'Audit A' }, { opId: expect.any(String) }]);
    expect(db.categories[0].name).toBe('Audit A');
  });

  test('image X → submitted Y → later X: saving persists X', async () => {
    const original = cats[0].image;
    const Y = 'https://example.test/y.png';
    const { updateCategory, resolveLater } = await editSetup();
    fireEvent.change(imageField(), { target: { value: Y } });
    await submitUncertain({ image: Y });
    fireEvent.change(imageField(), { target: { value: original } });
    await confirmCommitted(resolveLater);
    expect(unload()).toBe(true);
    await saveAndClose();
    expect(updateCategory.mock.calls[1]).toEqual(['c1', { image: original }, { opId: expect.any(String) }]);
    expect(db.categories[0].image).toBe(original);
  });

  test('A → submitted B → later C: saving persists C', async () => {
    const { updateCategory, resolveLater } = await editSetup();
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await submitUncertain({ name: 'Committed B' });
    fireEvent.change(field(), { target: { value: 'Third C' } });
    await confirmCommitted(resolveLater);
    await saveAndClose();
    expect(updateCategory.mock.calls[1]).toEqual(['c1', { name: 'Third C' }, { opId: expect.any(String) }]);
    expect(db.categories[0].name).toBe('Third C');
  });

  test('exit protection stays active until the later values are saved or discarded', async () => {
    const { resolveLater } = await editSetup();
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await submitUncertain({ name: 'Committed B' });
    fireEvent.change(field(), { target: { value: 'Audit A' } });
    await confirmCommitted(resolveLater);

    m.confirm.mockResolvedValueOnce(false);
    await goTo(/^Mahsulotlar/);
    expect(m.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Saqlanmagan o'zgarishlar" }));
    expect(field()).toHaveValue('Audit A');
    expect(unload()).toBe(true);

    // Typing the committed value back makes the draft clean again
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    expect(unload()).toBe(false);
    fireEvent.change(field(), { target: { value: 'Audit A' } });
    await saveAndClose();
    expect(unload()).toBe(false);
  });

  test('if the refresh fails, the submitted values become the baseline (no silent skip)', async () => {
    const { updateCategory, resolveLater } = await editSetup({ refreshCatalog: vi.fn().mockRejectedValue(new Error('offline')) });
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await submitUncertain({ name: 'Committed B' });
    fireEvent.change(field(), { target: { value: 'Audit A' } });
    await confirmCommitted(resolveLater);
    expect(unload()).toBe(true);
    await saveAndClose();
    expect(updateCategory.mock.calls[1]).toEqual(['c1', { name: 'Audit A' }, { opId: expect.any(String) }]);
  });

  test('a delayed refresh cannot touch a draft that was closed meanwhile', async () => {
    const refreshGate = deferred();
    const { resolveLater } = await editSetup({ refreshCatalog: vi.fn(() => refreshGate.promise) });
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await submitUncertain({ name: 'Committed B' });
    fireEvent.change(field(), { target: { value: 'Audit A' } });
    await act(async () => resolveLater.resolve('committed'));
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' })); // closed while refresh pending
    await act(async () => refreshGate.resolve({ products, categories: db.categories }));
    expect(screen.queryByLabelText(/Kategoriya nomi/)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(m.toast.info).not.toHaveBeenCalled();
  });

  test('a delayed refresh cannot rebase a different draft opened meanwhile', async () => {
    const refreshGate = deferred();
    const { updateCategory, resolveLater } = await editSetup({ refreshCatalog: vi.fn(() => refreshGate.promise) });
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await submitUncertain({ name: 'Committed B' });
    await act(async () => resolveLater.resolve('committed'));
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    fireEvent.click(card('Audit B').getByRole('button', { name: 'Tahrirlash' }));
    await act(async () => refreshGate.resolve({ products, categories: db.categories }));
    expect(field()).toHaveValue('Audit B');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(unload()).toBe(false); // other draft still clean against its own baseline
    await saveAndClose();
    expect(updateCategory).toHaveBeenCalledTimes(1); // nothing changed in the other draft → no write
  });

  test('Add: a recovered create turns the draft into an Edit of the created category', async () => {
    const resolveLater = deferred();
    m.api.categoriesAPI.resolveWrite.mockReturnValue(resolveLater.promise);
    const addCategory = vi.fn().mockImplementationOnce(async c => { db.categories.push({ id: 'new', ...c }); throw unknownError(); });
    const updateCategory = vi.fn().mockImplementation(async (id, u) => {
      const i = db.categories.findIndex(c => c.id === id);
      db.categories[i] = { ...db.categories[i], ...u };
      return db.categories[i];
    });
    await ui({ addCategory, updateCategory, refreshCatalog: vi.fn(async () => ({ products, categories: db.categories.map(c => ({ ...c })) })) });
    fireEvent.click(addButton());
    fireEvent.change(field(), { target: { value: 'Created' } });
    fireEvent.change(imageField(), { target: { value: 'https://example.test/c.png' } });
    await act(async () => { submit(); });
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Unknown'));
    fireEvent.change(field(), { target: { value: 'Created later' } });
    await act(async () => resolveLater.resolve('committed'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kategoriyani tahrirlash' })).toBeInTheDocument());
    await saveAndClose();
    expect(addCategory).toHaveBeenCalledTimes(1);
    expect(updateCategory).toHaveBeenCalledWith('new', { name: 'Created later' }, { opId: expect.any(String) });
    expect(db.categories.filter(c => c.name.startsWith('Created'))).toHaveLength(1);
  });
});

// ===========================================================================
// Local staging finding: saving again while an earlier save of the same draft
// is still unresolved must not compare against an outdated baseline
// ===========================================================================

describe('staging: save while an earlier save of the draft is unresolved', () => {
  const unknownError = () => Object.assign(new Error('Unknown'), { code: 'outcome_unknown', definitive: false });

  test('settles first; when committed, a changed-back value is really saved', async () => {
    m.api.categoriesAPI.resolveWrite.mockResolvedValueOnce('unknown').mockResolvedValue('committed');
    const updateCategory = vi.fn()
      .mockImplementationOnce(async () => { db.categories[0] = { ...db.categories[0], name: 'Committed B' }; throw unknownError(); })
      .mockImplementation(async (id, u) => { db.categories[0] = { ...db.categories[0], ...u }; return db.categories[0]; });
    await ui({ updateCategory, refreshCatalog: vi.fn(async () => ({ products, categories: db.categories.map(c => ({ ...c })) })) });
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await act(async () => { submit(); });
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Unknown'));
    fireEvent.change(field(), { target: { value: 'Audit A' } });
    await act(async () => { submit(); });
    await waitFor(() => expect(updateCategory).toHaveBeenCalledTimes(2));
    expect(updateCategory.mock.calls[1][1]).toMatchObject({ name: 'Audit A' });
    expect(db.categories[0].name).toBe('Audit A');
  });

  test('when still unknown, sends the full values instead of a possibly empty diff', async () => {
    m.api.categoriesAPI.resolveWrite.mockResolvedValue('unknown');
    const updateCategory = vi.fn()
      .mockRejectedValueOnce(unknownError())
      .mockImplementation(async (id, u) => ({ ...cats[0], ...u }));
    await ui({ updateCategory });
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await act(async () => { submit(); });
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Unknown'));
    fireEvent.change(field(), { target: { value: 'Audit A' } }); // equals the old baseline
    await act(async () => { submit(); });
    await waitFor(() => expect(updateCategory).toHaveBeenCalledTimes(2));
    expect(updateCategory.mock.calls[1][1]).toEqual({ name: 'Audit A', image: cats[0].image });
  });
});

describe('staging: unresolved saves count as unsaved work; recovered commits are audited', () => {
  const unknownError = () => Object.assign(new Error('Unknown'), { code: 'outcome_unknown', definitive: false });
  const unload = () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };

  test('a form that looks clean but has an unresolved save still guards exits', async () => {
    m.api.categoriesAPI.resolveWrite.mockResolvedValue('unknown');
    await ui({ updateCategory: vi.fn().mockRejectedValue(unknownError()) });
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await act(async () => { submit(); });
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Unknown'));
    fireEvent.change(field(), { target: { value: 'Audit A' } }); // equals the (possibly outdated) baseline
    expect(unload()).toBe(true);
    m.confirm.mockResolvedValueOnce(false);
    await goTo(/^Mahsulotlar/);
    expect(m.confirm).toHaveBeenCalled();
    expect(field()).toHaveValue('Audit A');
  });

  test('a commit recovered in the background is audit-logged as recovered', async () => {
    const later = deferred();
    m.api.categoriesAPI.resolveWrite.mockReturnValue(later.promise);
    await ui({ updateCategory: vi.fn().mockRejectedValue(unknownError()), refreshCatalog: vi.fn(async () => ({ products, categories: db.categories.map(c => ({ ...c })) })) });
    fireEvent.click(card().getByRole('button', { name: 'Tahrirlash' }));
    fireEvent.change(field(), { target: { value: 'Committed B' } });
    await act(async () => { submit(); });
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('Unknown'));
    db.categories[0] = { ...db.categories[0], name: 'Committed B' };
    await act(async () => later.resolve('committed'));
    await waitFor(() => expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'category.update', entityId: 'c1',
      oldData: expect.objectContaining({ name: 'Audit A' }), newData: expect.objectContaining({ name: 'Committed B' }),
      metadata: expect.objectContaining({ recoveredAfterUnknownOutcome: true })
    })));
  });
});
