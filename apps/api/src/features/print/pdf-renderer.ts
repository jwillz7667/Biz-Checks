import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkRectAt, printableArea, resolveCheck } from '@biz-checks/check-engine';
import {
  fromPoints,
  PaperSizes,
  type BankAccount,
  type CanvasObject,
  type CheckTemplate,
  type DataRow,
} from '@biz-checks/domain';
import { encodeMICRLine } from '@biz-checks/micr';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type Color,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';

export interface CheckRenderRow {
  /** Bank account snapshot used as the source of routing/account numbers. */
  account: BankAccount;
  /** Check serial number string for this row. */
  serialNumber: string;
  /** Snapshot of label-field values (Payee, Amount, etc.) for this row. */
  labelFieldValues: Record<string, string>;
  /** Optional linked-data-source row. */
  dataRow?: DataRow;
  /** Column order from the linked source. */
  dataColumns?: readonly string[];
}

export interface RenderBatchInput {
  template: CheckTemplate;
  rows: readonly CheckRenderRow[];
  /** Anchor for date/time builtins; omit to use the wall clock. */
  now?: Date;
  /** Embed VOID watermark on every check. */
  voidWatermark?: boolean;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the path to the embedded MICR E-13B TrueType font. We look for
 * `fonts/GnuMICR.ttf` at the repository root by default; the path can be
 * overridden with the MICR_FONT_PATH environment variable. The font must
 * be present in production deployments — it carries the U+2446–U+2449
 * MICR symbols used on the bottom check line.
 */
function micrFontPath(): string {
  if (process.env.MICR_FONT_PATH) return process.env.MICR_FONT_PATH;
  return resolve(__dirname, '../../../../../fonts/GnuMICR.ttf');
}

let cachedMICRFontBytes: Uint8Array | null = null;
async function loadMICRFontBytes(): Promise<Uint8Array | null> {
  if (cachedMICRFontBytes) return cachedMICRFontBytes;
  try {
    cachedMICRFontBytes = await readFile(micrFontPath());
    return cachedMICRFontBytes;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Render a multi-check batch to a PDF buffer. The result has one page per
 * sheet, with rows × columns checks per sheet according to the template's
 * stock. Coordinate system: pdf-lib uses bottom-up y; we convert from the
 * canvas's top-down y at draw time.
 */
export async function renderBatchPDF(input: RenderBatchInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const courier = await pdf.embedFont(StandardFonts.Courier);

  const micrBytes = await loadMICRFontBytes();
  // If the embedded MICR font isn't installed, render the MICR line in
  // monospace as a development fallback. Production deployments must
  // provide GnuMICR.ttf — checks rendered without it will not be machine
  // readable by bank scanners.
  const micr = micrBytes ? await pdf.embedFont(micrBytes, { subset: true }) : courier;

  const fonts = { helvetica, helveticaBold, helveticaOblique, courier, micr };

  const stock = input.template.stock;
  const paper = PaperSizes[stock.paperSize];
  const checksPerSheet = stock.rows * stock.columns;

  let page: PDFPage | null = null;

  for (let i = 0; i < input.rows.length; i += 1) {
    const slot = i % checksPerSheet;
    if (slot === 0) {
      page = pdf.addPage([paper.width, paper.height]);
    }
    if (!page) throw new Error('unreachable: page not initialized');

    const row = Math.floor(slot / stock.columns);
    const col = slot % stock.columns;
    const rect = checkRectAt(stock, row, col);
    const printable = printableArea(stock);
    const rowData = input.rows[i];
    if (!rowData) continue;

    const resolved = resolveCheck({
      template: input.template,
      account: rowData.account,
      labelNumber: i + 1,
      totalLabels: input.rows.length,
      serialNumber: rowData.serialNumber,
      labelFieldValues: rowData.labelFieldValues,
      dataRow: rowData.dataRow,
      dataColumns: rowData.dataColumns,
      now: input.now,
    });

    drawCheckBackground(page, rect, paper, printable);
    for (const r of resolved) {
      drawObject(page, r.object, r.resolvedText, rect, paper, fonts, rowData);
    }
    if (input.voidWatermark) drawVoidWatermark(page, rect, paper, helveticaBold);
  }

  return pdf.save();
}

interface FontSet {
  helvetica: PDFFont;
  helveticaBold: PDFFont;
  helveticaOblique: PDFFont;
  courier: PDFFont;
  micr: PDFFont;
}

function drawCheckBackground(
  page: PDFPage,
  checkRect: { x: number; y: number; width: number; height: number },
  paper: { width: number; height: number },
  printable: { width: number; height: number },
): void {
  // Light security border around the printable area
  const x = checkRect.x;
  const y = paper.height - checkRect.y - checkRect.height;
  page.drawRectangle({
    x,
    y: y + (checkRect.height - printable.height),
    width: printable.width,
    height: printable.height,
    borderColor: rgb(0.78, 0.83, 0.92),
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });
}

function drawObject(
  page: PDFPage,
  obj: CanvasObject,
  text: string,
  checkRect: { x: number; y: number; width: number; height: number },
  paper: { width: number; height: number },
  fonts: FontSet,
  rowData: CheckRenderRow,
): void {
  const absX = checkRect.x + obj.position.x;
  const absYTop = checkRect.y + obj.position.y;
  // Convert top-down canvas y to bottom-up PDF y
  const absY = paper.height - absYTop - obj.size.height;

  switch (obj.kind) {
    case 'shape':
      drawShape(page, obj, absX, absY);
      return;
    case 'image':
    case 'signature':
      // Image embedding is delegated to a higher layer (signature service)
      // for security. Here we draw a placeholder line so layout remains intact.
      page.drawLine({
        start: { x: absX, y: absY + obj.size.height / 2 },
        end: { x: absX + obj.size.width, y: absY + obj.size.height / 2 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
      return;
    case 'micr': {
      const renderedText = ensureMICR(text, rowData);
      drawText(page, renderedText, absX, absY, obj.size, {
        font: fonts.micr,
        fontSize: obj.fontSize,
        color: hex(obj.color),
        justification: obj.justification,
      });
      return;
    }
    case 'text': {
      drawText(page, text, absX, absY, obj.size, {
        font: pickFont(fonts, obj.fontWeight, obj.italic),
        fontSize: obj.fontSize,
        color: hex(obj.color),
        justification: obj.justification,
        lineHeight: obj.lineHeight,
      });
      return;
    }
    case 'amount-box': {
      const display = obj.showCurrencySymbol ? `$${text}` : text;
      drawText(page, display, absX, absY, obj.size, {
        font: pickFont(fonts, obj.fontWeight, false),
        fontSize: obj.fontSize,
        color: hex(obj.color),
        justification: obj.justification,
      });
      // Box border for amount box
      page.drawRectangle({
        x: absX,
        y: absY,
        width: obj.size.width,
        height: obj.size.height,
        borderColor: rgb(0.4, 0.4, 0.4),
        borderWidth: 0.5,
      });
      return;
    }
  }
}

function drawShape(
  page: PDFPage,
  obj: Extract<CanvasObject, { kind: 'shape' }>,
  x: number,
  y: number,
): void {
  switch (obj.shape) {
    case 'line':
      page.drawLine({
        start: { x, y: y + obj.size.height },
        end: { x: x + obj.size.width, y: y + obj.size.height },
        thickness: obj.strokeWidth,
        color: hex(obj.strokeColor),
      });
      return;
    case 'rectangle':
      page.drawRectangle({
        x,
        y,
        width: obj.size.width,
        height: obj.size.height,
        borderColor: hex(obj.strokeColor),
        borderWidth: obj.strokeWidth,
        color: obj.fillColor ? hex(obj.fillColor) : undefined,
      });
      return;
    case 'ellipse':
      page.drawEllipse({
        x: x + obj.size.width / 2,
        y: y + obj.size.height / 2,
        xScale: obj.size.width / 2,
        yScale: obj.size.height / 2,
        borderColor: hex(obj.strokeColor),
        borderWidth: obj.strokeWidth,
        color: obj.fillColor ? hex(obj.fillColor) : undefined,
      });
      return;
  }
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: { width: number; height: number },
  opts: {
    font: PDFFont;
    fontSize: number;
    color: Color;
    justification: 'left' | 'center' | 'right';
    lineHeight?: number;
  },
): void {
  const lines = text.split(/\r?\n/);
  const lineHeight = opts.fontSize * (opts.lineHeight ?? 1.2);
  // Top-anchored: place the first line near the top of the box
  let cursorY = y + size.height - lineHeight;
  for (const line of lines) {
    const textWidth = opts.font.widthOfTextAtSize(line, opts.fontSize);
    let drawX = x;
    if (opts.justification === 'center') drawX = x + (size.width - textWidth) / 2;
    else if (opts.justification === 'right') drawX = x + size.width - textWidth;
    page.drawText(line, {
      x: drawX,
      y: cursorY,
      size: opts.fontSize,
      font: opts.font,
      color: opts.color,
    });
    cursorY -= lineHeight;
  }
}

function pickFont(fonts: FontSet, weight: 'regular' | 'medium' | 'semibold' | 'bold', italic: boolean): PDFFont {
  if (italic && weight === 'regular') return fonts.helveticaOblique;
  if (weight === 'bold' || weight === 'semibold') return fonts.helveticaBold;
  return fonts.helvetica;
}

function drawVoidWatermark(
  page: PDFPage,
  checkRect: { x: number; y: number; width: number; height: number },
  paper: { width: number; height: number },
  font: PDFFont,
): void {
  const text = 'VOID';
  const fontSize = 96;
  const w = font.widthOfTextAtSize(text, fontSize);
  const cx = checkRect.x + checkRect.width / 2;
  const cy = paper.height - (checkRect.y + checkRect.height / 2);
  page.drawText(text, {
    x: cx - w / 2,
    y: cy - fontSize / 2,
    size: fontSize,
    font,
    color: rgb(0.92, 0.78, 0.78),
    rotate: { type: 'degrees', angle: -20 } as never,
  });
}

function ensureMICR(text: string, rowData: CheckRenderRow): string {
  if (text && text.trim().length > 0) return text;
  const r = encodeMICRLine({
    routing: rowData.account.routingNumber,
    account: rowData.account.accountNumber,
    serial: rowData.serialNumber,
    auxOnUs: rowData.account.auxOnUs,
  });
  if (!r.ok) throw r.error;
  return r.value;
}

function hex(input: string): Color {
  // Accept #RRGGBB or #RRGGBBAA — alpha is ignored by pdf-lib's primitive draw API.
  const v = input.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/** Convert PDF points to inches for log/debug output. */
export function debugInches(points: number): string {
  return `${fromPoints(points, 'inch').toFixed(3)}″`;
}
