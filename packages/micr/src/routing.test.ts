import { describe, expect, it } from 'vitest';

import { fedDistrict, isValidRoutingChecksum, validateRoutingNumber } from './routing.js';

describe('isValidRoutingChecksum', () => {
  // Real, well-known valid routing numbers used as test fixtures.
  // (These are publicly listed and not sensitive.)
  it.each([
    ['021000021', 'JPMorgan Chase'],
    ['026009593', 'Bank of America'],
    ['121000248', 'Wells Fargo'],
    ['111000025', 'Federal Reserve Bank'],
  ])('accepts %s (%s)', (n) => {
    expect(isValidRoutingChecksum(n)).toBe(true);
  });

  it.each(['000000000', '021000022', '123456789', '111111111'])('rejects %s', (n) => {
    expect(isValidRoutingChecksum(n)).toBe(false);
  });

  it('rejects non-9-digit input', () => {
    expect(isValidRoutingChecksum('12345')).toBe(false);
    expect(isValidRoutingChecksum('1234567890')).toBe(false);
    expect(isValidRoutingChecksum('abcdefghi')).toBe(false);
  });
});

describe('validateRoutingNumber', () => {
  it('strips whitespace and accepts valid routing', () => {
    const r = validateRoutingNumber('021 000 021');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('021000021');
  });

  it('returns MICR_INVALID for wrong-length input', () => {
    const r = validateRoutingNumber('123');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('MICR_INVALID');
  });

  it('returns ROUTING_CHECKSUM_FAILED for length-9 with bad checksum', () => {
    const r = validateRoutingNumber('123456789');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('ROUTING_CHECKSUM_FAILED');
  });
});

describe('fedDistrict', () => {
  it('returns NY for routing starting with 02', () => {
    expect(fedDistrict('021000021')).toBe('New York');
  });

  it('returns SF for routing starting with 12', () => {
    expect(fedDistrict('121000248')).toBe('San Francisco');
  });

  it('returns null for unknown prefixes', () => {
    expect(fedDistrict('999999999')).toBeNull();
  });
});
