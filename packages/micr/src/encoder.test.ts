import { describe, expect, it } from 'vitest';

import { encodeMICRLine, normalizeToFallbacks, normalizeToGlyphs, stripNonMICR } from './encoder.js';

describe('encodeMICRLine', () => {
  it('produces a valid line for routing/account/serial', () => {
    const r = encodeMICRLine({
      routing: '021000021',
      account: '0710527197',
      serial: '0001',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // ⑆021000021⑆ 0710527197 ⑈0001⑈
      expect(r.value).toContain('021000021');
      expect(r.value).toContain('0710527197');
      expect(r.value).toContain('0001');
      // glyph form by default
      expect(r.value).toContain('⑆');
      expect(r.value).toContain('⑈');
    }
  });

  it('uses ASCII fallbacks when style=fallback', () => {
    const r = encodeMICRLine({
      routing: '021000021',
      account: '0710527197',
      serial: '0001',
      style: 'fallback',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toContain('A021000021A');
      expect(r.value).toContain('C0001C');
    }
  });

  it('rejects invalid routing checksum', () => {
    const r = encodeMICRLine({
      routing: '111111111',
      account: '12345',
      serial: '1',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('ROUTING_CHECKSUM_FAILED');
  });

  it('rejects too-short account number', () => {
    const r = encodeMICRLine({ routing: '021000021', account: '12', serial: '1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('MICR_INVALID');
  });

  it('includes optional auxiliary on-us', () => {
    const r = encodeMICRLine({
      routing: '021000021',
      account: '0710527197',
      serial: '0001',
      auxOnUs: '12345',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toContain('⑈12345⑈');
  });

  it('includes optional EPC', () => {
    const r = encodeMICRLine({
      routing: '021000021',
      account: '0710527197',
      serial: '0001',
      epc: '5',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatch(/\b5\b/);
  });
});

describe('normalize / strip', () => {
  it('round-trips between glyph and fallback form', () => {
    const fallback = 'A021000021A 0710527197 C0001C';
    const glyphs = normalizeToGlyphs(fallback);
    expect(glyphs).toContain('⑆');
    expect(normalizeToFallbacks(glyphs)).toBe(fallback);
  });

  it('strips non-E13B characters', () => {
    expect(stripNonMICR('foo ⑆021000021⑆ bar')).toBe(' ⑆021000021⑆ ');
  });
});
