// Regression tests for B8 (release/2026-10-checkout-b8/PROPOSAL.md): checkout
// creates the order as anon, which may INSERT but not SELECT orders. Asking for
// the inserted row back (.select()) made every checkout insert fail with 42501.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ insert: vi.fn(), select: vi.fn(), from: vi.fn(), result: { error: null } }));

vi.mock('../lib/supabase', () => ({ supabase: { from: m.from, rpc: vi.fn() } }));

import { ordersAPI } from '../services/api';

const checkoutOrder = () => ({
  id: 'ORD-1792900000000-42',
  paymeOrderId: '1792900000000042',
  userId: '00000000-0000-0000-0000-0000000000b1',
  userTelegramId: '12345',
  userName: 'Test Buyer',
  userPhone: '+998000000000',
  items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 2, price: 45000 }],
  deliveryInfo: { city: 'Toshkent', payme_order_id: '1792900000000042' },
  courier: { name: 'N/A', duration: 'Pickup' },
  subtotal: 90000,
  bonusDiscount: 0,
  bonusPointsUsed: 0,
  deliveryFee: 10000,
  total: 100000,
  status: 'pending'
});

beforeEach(() => {
  m.result = { error: null };
  m.select.mockReset();
  // The insert builder is awaitable; .select() would turn it into a read-back
  m.insert.mockReset().mockImplementation(() => {
    const p = new Promise(resolve => setTimeout(() => resolve(m.result), 0));
    p.select = m.select.mockReturnValue({ single: () => p });
    return p;
  });
  m.from.mockReset().mockReturnValue({ insert: m.insert });
});

describe('ordersAPI.create (B8)', () => {
  it('inserts without asking for the row back', async () => {
    await ordersAPI.create(checkoutOrder());
    expect(m.from).toHaveBeenCalledWith('orders');
    expect(m.insert).toHaveBeenCalledTimes(1);
    expect(m.select).not.toHaveBeenCalled();
  });

  it('sends the client-generated keys and returns the order built from them', async () => {
    const created = await ordersAPI.create(checkoutOrder());
    const [[[sent]]] = m.insert.mock.calls;
    expect(sent.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent).toMatchObject({ order_number: 'ORD-1792900000000-42', payme_order_id: '1792900000000042', status: 'pending', total: 100000 });
    expect(created).toMatchObject({
      dbId: sent.id,
      id: 'ORD-1792900000000-42',
      orderNumber: 'ORD-1792900000000-42',
      paymeOrderId: '1792900000000042',
      userId: '00000000-0000-0000-0000-0000000000b1',
      userTelegramId: '12345',
      status: 'pending',
      total: 100000,
      subtotal: 90000,
      deliveryFee: 10000,
      items: checkoutOrder().items
    });
    expect(created.createdAt).toEqual(expect.any(String));
    expect(created.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('resolves only after the database confirmed the insert', async () => {
    let settled = false;
    const pending = ordersAPI.create(checkoutOrder()).then(() => { settled = true; });
    expect(settled).toBe(false);
    await pending;
    expect(settled).toBe(true);
  });

  it('propagates insert failures (checkout must not continue to payment)', async () => {
    const failure = { code: '42501', message: 'permission denied for table orders' };
    m.result = { error: failure };
    await expect(ordersAPI.create(checkoutOrder())).rejects.toBe(failure);
  });
});
