import { describe, expect, it } from 'vitest';

import { formatMoney, moneyFromMajor, moneyToMajor, moneyToWords } from './currency.js';

describe('moneyFromMajor', () => {
  it('rounds half-up with banker safety: 1234.567 → 123457 minor units', () => {
    expect(moneyFromMajor(1234.567, 'USD').minorUnits).toBe(123457);
  });

  it('handles zero', () => {
    expect(moneyFromMajor(0, 'USD').minorUnits).toBe(0);
  });
});

describe('moneyToMajor', () => {
  it('round-trips through cents without float drift', () => {
    const m = moneyFromMajor(1234.56, 'USD');
    expect(moneyToMajor(m)).toBe(1234.56);
  });
});

describe('formatMoney', () => {
  it('formats with USD symbol by default', () => {
    expect(formatMoney({ minorUnits: 123456, currency: 'USD' })).toBe('$1,234.56');
  });

  it('formats GBP with pound sign', () => {
    expect(formatMoney({ minorUnits: 5000, currency: 'GBP' })).toBe('£50.00');
  });

  it('omits symbol when symbol:false', () => {
    expect(formatMoney({ minorUnits: 123456, currency: 'USD' }, { symbol: false })).toBe(
      '1,234.56',
    );
  });
});

describe('moneyToWords', () => {
  it('zero dollars', () => {
    expect(moneyToWords({ minorUnits: 0, currency: 'USD' })).toBe('Zero and 00/100');
  });

  it('formats simple dollar amounts', () => {
    expect(moneyToWords({ minorUnits: 100, currency: 'USD' })).toBe('One and 00/100');
  });

  it('formats hundreds correctly', () => {
    expect(moneyToWords({ minorUnits: 12345, currency: 'USD' })).toBe(
      'One Hundred Twenty-Three and 45/100',
    );
  });

  it('formats thousands correctly', () => {
    expect(moneyToWords({ minorUnits: 123456, currency: 'USD' })).toBe(
      'One Thousand Two Hundred Thirty-Four and 56/100',
    );
  });

  it('formats millions correctly', () => {
    expect(moneyToWords({ minorUnits: 100_000_000, currency: 'USD' })).toBe(
      'One Million and 00/100',
    );
  });

  it('formats complex amounts: $1,234,567.89', () => {
    expect(moneyToWords({ minorUnits: 123_456_789, currency: 'USD' })).toBe(
      'One Million Two Hundred Thirty-Four Thousand Five Hundred Sixty-Seven and 89/100',
    );
  });

  it('throws on negative amounts (cannot legally render)', () => {
    expect(() => moneyToWords({ minorUnits: -1, currency: 'USD' })).toThrow();
  });
});
