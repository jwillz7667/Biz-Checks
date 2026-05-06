import { describe, expect, it } from 'vitest';

import { fromPoints, PaperSizes, toPoints } from './units.js';

describe('toPoints / fromPoints', () => {
  it('converts inches to points (72 pt/in)', () => {
    expect(toPoints(1, 'inch')).toBe(72);
    expect(toPoints(8.5, 'inch')).toBe(612);
  });

  it('converts mm to points', () => {
    expect(toPoints(25.4, 'mm')).toBeCloseTo(72, 5);
  });

  it('round-trips inch through points', () => {
    expect(fromPoints(toPoints(8.5, 'inch'), 'inch')).toBe(8.5);
  });

  it('points pass through unchanged', () => {
    expect(toPoints(72, 'pt')).toBe(72);
    expect(fromPoints(72, 'pt')).toBe(72);
  });
});

describe('PaperSizes', () => {
  it('Letter is 612 x 792 pt', () => {
    expect(PaperSizes.Letter.width).toBe(612);
    expect(PaperSizes.Letter.height).toBe(792);
  });

  it('A4 is roughly 595 x 842 pt', () => {
    expect(PaperSizes.A4.width).toBeCloseTo(595, 0);
    expect(PaperSizes.A4.height).toBeCloseTo(842, 0);
  });
});
