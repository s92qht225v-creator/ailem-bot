// Regression tests for R5-03 (production-security-fix-review): a numeric
// click_trans_id was compared with === against the TEXT column, so a replayed
// complete was not recognised and stock was deducted again (5 → 4 → 3).
import { describe, expect, it } from 'vitest';
import { canonicalClickTransId } from '../lib/paymentIds';

describe('canonicalClickTransId', () => {
  it('maps the numeric and string forms of one id to the same value', () => {
    expect(canonicalClickTransId(937807558)).toBe('937807558');
    expect(canonicalClickTransId('937807558')).toBe('937807558');
    expect(canonicalClickTransId(' 937807558 ')).toBe('937807558');
    expect(canonicalClickTransId('000937807558')).toBe('937807558');
    expect(canonicalClickTransId(0)).toBe('0');
    expect(canonicalClickTransId('000')).toBe('0');
  });

  it('rejects anything that is not a plain non-negative integer', () => {
    for (const bad of [undefined, null, '', '  ', -1, '-1', 1.5, '1.5', '1e3', 'abc', '12a',
      Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, {}, [], true, '1'.repeat(21)]) {
      expect(canonicalClickTransId(bad)).toBeNull();
    }
  });
});
