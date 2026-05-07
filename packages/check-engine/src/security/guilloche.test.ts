import { describe, expect, it } from 'vitest';

import { DEFAULT_GUILLOCHE, curveToSvgPath, generateGuilloche } from './guilloche.js';

describe('generateGuilloche', () => {
  it('emits the requested number of curves, each with steps + 1 sampled points', () => {
    const curves = generateGuilloche({
      width: 300,
      height: 100,
      ...DEFAULT_GUILLOCHE,
    });
    expect(curves).toHaveLength(DEFAULT_GUILLOCHE.curves);
    for (const buf of curves) {
      expect(buf.length).toBe((DEFAULT_GUILLOCHE.steps + 1) * 2);
    }
  });

  it('keeps every sampled point inside the bounding box', () => {
    const width = 504;
    const height = 216;
    const curves = generateGuilloche({ width, height, ...DEFAULT_GUILLOCHE });
    for (const buf of curves) {
      for (let i = 0; i < buf.length; i += 2) {
        const x = buf[i]!;
        const y = buf[i + 1]!;
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(height);
      }
    }
  });

  it('phase-shifts curves so neighbours are not identical', () => {
    const curves = generateGuilloche({
      width: 200,
      height: 200,
      ...DEFAULT_GUILLOCHE,
      curves: 3,
    });
    const a = curves[0]!;
    const b = curves[1]!;
    let differences = 0;
    for (let i = 0; i < a.length; i += 1) {
      if (Math.abs(a[i]! - b[i]!) > 1e-3) differences += 1;
    }
    // Should diverge at most points, not coincide.
    expect(differences).toBeGreaterThan(a.length * 0.5);
  });

  it('produces a deterministic output for the same input', () => {
    const opts = { width: 200, height: 100, ...DEFAULT_GUILLOCHE };
    const a = generateGuilloche(opts);
    const b = generateGuilloche(opts);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i += 1) {
      expect(Array.from(a[i]!)).toEqual(Array.from(b[i]!));
    }
  });
});

describe('curveToSvgPath', () => {
  it('emits "M x y L x y …" with 2-decimal precision', () => {
    const buf = new Float32Array([1, 2, 3.456, 7.891, 10, 20]);
    expect(curveToSvgPath(buf)).toBe('M 1.00 2.00 L 3.46 7.89 L 10.00 20.00');
  });

  it('returns an empty string for short inputs', () => {
    expect(curveToSvgPath(new Float32Array([1, 2]))).toBe('');
    expect(curveToSvgPath(new Float32Array(0))).toBe('');
  });
});
