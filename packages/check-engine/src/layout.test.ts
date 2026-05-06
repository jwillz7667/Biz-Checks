import { toPoints } from '@biz-checks/domain';
import { describe, expect, it } from 'vitest';

import { autoFitCheckSize, checkRectAt, checksPerSheet, sheetCount } from './layout.js';
import { Stocks } from './templates/stocks.js';

describe('checkRectAt', () => {
  it('places top check at origin for 3-up stock', () => {
    const stock = Stocks['business-3up'];
    if (!stock) throw new Error('stock missing');
    const r = checkRectAt(stock, 0, 0);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.width).toBe(toPoints(8.5, 'inch'));
    expect(r.height).toBe(toPoints(3.5, 'inch'));
  });

  it('places second check below the first', () => {
    const stock = Stocks['business-3up'];
    if (!stock) throw new Error('stock missing');
    const r = checkRectAt(stock, 1, 0);
    expect(r.y).toBe(toPoints(3.5, 'inch'));
  });

  it('throws on out-of-range row', () => {
    const stock = Stocks['business-3up'];
    if (!stock) throw new Error('stock missing');
    expect(() => checkRectAt(stock, 5, 0)).toThrow(RangeError);
  });
});

describe('checksPerSheet / sheetCount', () => {
  it('3-up gives 3 per sheet', () => {
    const stock = Stocks['business-3up'];
    if (!stock) throw new Error('stock missing');
    expect(checksPerSheet(stock)).toBe(3);
    expect(sheetCount(stock, 1)).toBe(1);
    expect(sheetCount(stock, 3)).toBe(1);
    expect(sheetCount(stock, 4)).toBe(2);
    expect(sheetCount(stock, 100)).toBe(34);
  });
});

describe('autoFitCheckSize', () => {
  it('partitions Letter into 3 equal-height bands with 0 margins', () => {
    const fit = autoFitCheckSize(
      { width: toPoints(8.5, 'inch'), height: toPoints(11, 'inch') },
      { top: 0, right: 0, bottom: 0, left: 0 },
      { horizontal: 0, vertical: 0 },
      3,
      1,
    );
    expect(fit.width).toBe(toPoints(8.5, 'inch'));
    expect(fit.height).toBeCloseTo(toPoints(11 / 3, 'inch'), 5);
  });

  it('throws when margins exceed paper', () => {
    expect(() =>
      autoFitCheckSize(
        { width: 100, height: 100 },
        { top: 60, right: 0, bottom: 60, left: 0 },
        { horizontal: 0, vertical: 0 },
        1,
        1,
      ),
    ).toThrow(RangeError);
  });
});
