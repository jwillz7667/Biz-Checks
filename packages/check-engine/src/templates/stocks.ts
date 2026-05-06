import { PaperSizes, toPoints } from '@biz-checks/domain';

import type { CheckStock } from '@biz-checks/domain';

const inch = (n: number) => toPoints(n, 'inch');

/**
 * Standard ANSI X9.100-compliant business check stock layouts.
 * All checks are 8.5" wide × 3.5" tall on US Letter paper.
 *
 * The MICR clear band (5/8 inch from the bottom) is enforced by the
 * default template blueprints, not by the stock itself.
 */
export const Stocks: Record<string, CheckStock> = {
  'business-3up': {
    type: 'three-per-page',
    paperSize: 'Letter',
    rows: 3,
    columns: 1,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    spacing: { horizontal: 0, vertical: 0 },
    checkSize: { width: PaperSizes.Letter.width, height: inch(3.5) },
    perforationBottom: 0,
  },
  'business-3up-perf': {
    type: 'three-per-page',
    paperSize: 'Letter',
    rows: 3,
    columns: 1,
    margins: { top: 0, right: 0, bottom: inch(0.5), left: 0 },
    spacing: { horizontal: 0, vertical: 0 },
    checkSize: { width: PaperSizes.Letter.width, height: inch(3.5) },
    perforationBottom: inch(0.5),
  },
  'voucher-top': {
    type: 'top-check',
    paperSize: 'Letter',
    rows: 1,
    columns: 1,
    margins: { top: 0, right: 0, bottom: inch(7.5), left: 0 },
    spacing: { horizontal: 0, vertical: 0 },
    checkSize: { width: PaperSizes.Letter.width, height: inch(3.5) },
    perforationBottom: 0,
  },
  'voucher-bottom': {
    type: 'bottom-check',
    paperSize: 'Letter',
    rows: 1,
    columns: 1,
    margins: { top: inch(7.5), right: 0, bottom: 0, left: 0 },
    spacing: { horizontal: 0, vertical: 0 },
    checkSize: { width: PaperSizes.Letter.width, height: inch(3.5) },
    perforationBottom: 0,
  },
  'voucher-middle': {
    type: 'middle-check',
    paperSize: 'Letter',
    rows: 1,
    columns: 1,
    margins: { top: inch(3.75), right: 0, bottom: inch(3.75), left: 0 },
    spacing: { horizontal: 0, vertical: 0 },
    checkSize: { width: PaperSizes.Letter.width, height: inch(3.5) },
    perforationBottom: 0,
  },
};

export type StockId = keyof typeof Stocks;
