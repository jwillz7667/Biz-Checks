import {
  type CheckStock,
  type Margins,
  type Points,
  type Rect,
  type Size,
  PaperSizes,
} from '@biz-checks/domain';

/**
 * Compute the position of an individual check on its sheet, given the
 * 0-based row and column. All units are points.
 */
export function checkRectAt(stock: CheckStock, row: number, column: number): Rect {
  if (row < 0 || row >= stock.rows) {
    throw new RangeError(`Row ${row} out of range [0, ${stock.rows})`);
  }
  if (column < 0 || column >= stock.columns) {
    throw new RangeError(`Column ${column} out of range [0, ${stock.columns})`);
  }
  const x = stock.margins.left + column * (stock.checkSize.width + stock.spacing.horizontal);
  const y = stock.margins.top + row * (stock.checkSize.height + stock.spacing.vertical);
  return { x, y, width: stock.checkSize.width, height: stock.checkSize.height };
}

/**
 * Compute the printable region of one check after subtracting any local
 * margins (perforation, edge guards, etc.). Returned coordinates are
 * relative to the check's top-left corner.
 */
export function printableArea(stock: CheckStock): Rect {
  return {
    x: 0,
    y: 0,
    width: stock.checkSize.width,
    height: stock.checkSize.height - stock.perforationBottom,
  };
}

/**
 * Auto-fit `rows × cols` checks within the given paper size and returns
 * the implied check size. Used when the stock chooses to auto-calculate.
 */
export function autoFitCheckSize(
  paper: Size,
  margins: Margins,
  spacing: { horizontal: Points; vertical: Points },
  rows: number,
  cols: number,
): Size {
  if (rows <= 0 || cols <= 0) throw new RangeError('Rows and columns must be > 0');
  const usableWidth = paper.width - margins.left - margins.right - spacing.horizontal * (cols - 1);
  const usableHeight = paper.height - margins.top - margins.bottom - spacing.vertical * (rows - 1);
  if (usableWidth <= 0 || usableHeight <= 0) {
    throw new RangeError('Margins/spacing exceed paper size');
  }
  return {
    width: usableWidth / cols,
    height: usableHeight / rows,
  };
}

/**
 * Returns paper dimensions (in pt) for the named paper size. Convenience
 * helper for callers who want to avoid importing `PaperSizes` directly.
 */
export function paperSize(name: keyof typeof PaperSizes): Size {
  return PaperSizes[name];
}

/** Number of checks per sheet for the given stock. */
export function checksPerSheet(stock: CheckStock): number {
  return stock.rows * stock.columns;
}

/** Total sheet count needed to render `count` checks. */
export function sheetCount(stock: CheckStock, count: number): number {
  return Math.ceil(count / checksPerSheet(stock));
}
