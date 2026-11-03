// Canonical form of a Click transaction id for storage and comparison.
// Click sends integer ids; signed JSON may carry them as numbers or strings
// (orders.click_trans_id is TEXT). Returns a digits-only string, or null for
// anything that is not a plain non-negative integer.
export function canonicalClickTransId(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return /^\d{1,20}$/.test(s) ? s.replace(/^0+(?=\d)/, '') : null;
}
