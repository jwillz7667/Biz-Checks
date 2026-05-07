import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkRectAt,
  curveToSvgPath,
  generateGuilloche,
  printableArea,
  resolveCheck,
} from '@biz-checks/check-engine';
import {
  fromPoints,
  PaperSizes,
  type BankAccount,
  type CanvasObject,
  type CheckTemplate,
  type DataRow,
  type SecurityPattern,
  type SignatureFont,
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
 * Signature script fonts. Each is a SIL Open Font Licensed family that can
 * be embedded into PDFs without a per-document royalty. Filenames match the
 * canonical Google Fonts release tarballs (`<Family>-Regular.ttf`).
 *
 * Resolution mirrors the MICR font: an env var override (`SIGNATURE_FONT_DIR`)
 * wins, otherwise we look in the repo-root `fonts/` directory.
 */
const SIGNATURE_FONT_FILES: Record<SignatureFont, string> = {
  caveat: 'Caveat-Regular.ttf',
  sacramento: 'Sacramento-Regular.ttf',
  'great-vibes': 'GreatVibes-Regular.ttf',
};

function signatureFontPath(font: SignatureFont): string {
  const dir = process.env.SIGNATURE_FONT_DIR ?? resolve(__dirname, '../../../../../fonts');
  return resolve(dir, SIGNATURE_FONT_FILES[font]);
}

const cachedSignatureBytes: Partial<Record<SignatureFont, Uint8Array | null>> = {};
async function loadSignatureFontBytes(font: SignatureFont): Promise<Uint8Array | null> {
  if (font in cachedSignatureBytes) return cachedSignatureBytes[font] ?? null;
  try {
    const bytes = await readFile(signatureFontPath(font));
    cachedSignatureBytes[font] = bytes;
    return bytes;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      cachedSignatureBytes[font] = null;
      return null;
    }
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

  // Lazy-load signature fonts: only embed the families actually referenced
  // by the template so empty deploys don't fail and small-template renders
  // stay slim.
  const requestedSignatureFonts = collectSignatureFonts(input.template);
  const signature: Record<SignatureFont, PDFFont> = {
    caveat: helveticaOblique,
    sacramento: helveticaOblique,
    'great-vibes': helveticaOblique,
  };
  for (const family of requestedSignatureFonts) {
    const bytes = await loadSignatureFontBytes(family);
    if (bytes) signature[family] = await pdf.embedFont(bytes, { subset: true });
  }

  const fonts = { helvetica, helveticaBold, helveticaOblique, courier, micr, signature };

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
    drawSecurityPattern(page, input.template.securityPattern, rect, paper, printable);
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
  signature: Record<SignatureFont, PDFFont>;
}

function collectSignatureFonts(template: CheckTemplate): readonly SignatureFont[] {
  const set = new Set<SignatureFont>();
  for (const obj of template.objects) {
    if (obj.kind === 'signature' && obj.signerName) set.add(obj.fontFamily);
  }
  return [...set];
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

/**
 * Render an optional security background underneath all canvas objects.
 * The generator emits coords in canvas (top-down) space relative to the
 * printable area's top-left. pdf-lib's `drawSvgPath` takes care of the
 * y-flip internally via `scale(1, -1)`, so we only need to anchor the SVG
 * origin (0,0) at the printable area's top-left in pdf-lib (bottom-up)
 * coords.
 */
function drawSecurityPattern(
  page: PDFPage,
  pattern: SecurityPattern,
  checkRect: { x: number; y: number; width: number; height: number },
  paper: { width: number; height: number },
  printable: { width: number; height: number },
): void {
  if (pattern.kind !== 'guilloche') return;

  // The printable area is anchored at the check's top edge (see
  // `printableArea` — y: 0 relative to the check) so its top-left in
  // pdf-lib coords is the check's top-left.
  const originX = checkRect.x;
  const originYPdf = paper.height - checkRect.y;

  const curves = generateGuilloche({
    width: printable.width,
    height: printable.height,
    complexity: pattern.complexity,
    density: pattern.density,
    curves: pattern.curves,
    steps: 360,
    amplitude: pattern.amplitude,
  });

  const color = hex(pattern.color);
  for (const curve of curves) {
    page.drawSvgPath(curveToSvgPath(curve), {
      x: originX,
      y: originYPdf,
      borderColor: color,
      borderWidth: pattern.lineWidth,
      borderOpacity: pattern.opacity,
    });
  }
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
      // Raster image embedding is delegated to a higher layer; here we
      // draw a placeholder line so layout remains intact.
      page.drawLine({
        start: { x: absX, y: absY + obj.size.height / 2 },
        end: { x: absX + obj.size.width, y: absY + obj.size.height / 2 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
      return;
    case 'signature': {
      // Image-based signatures are still resolved by the signature service
      // (out of scope here). For text-mode signatures we draw the signer
      // name in the chosen script font. Always underline the baseline so
      // the signature line remains visible even when no name is set.
      page.drawLine({
        start: { x: absX, y: absY + obj.size.height * 0.15 },
        end: { x: absX + obj.size.width, y: absY + obj.size.height * 0.15 },
        thickness: 0.5,
        color: rgb(0.55, 0.55, 0.6),
      });
      if (obj.signerName && obj.signerName.trim().length > 0) {
        const font = fonts.signature[obj.fontFamily];
        drawText(page, obj.signerName, absX, absY, obj.size, {
          font,
          fontSize: obj.fontSize,
          color: hex(obj.color),
          justification: 'center',
        });
      }
      return;
    }
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
