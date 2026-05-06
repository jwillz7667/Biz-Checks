import { toPoints } from '@biz-checks/domain';

import type { CanvasObject, CanvasObjectId } from '@biz-checks/domain';

/**
 * Canvas-object factory that produces a fully security-featured business
 * check layout (8.5" × 3.5"), composing ANSI X9.100-160 / X9.100-161 and
 * Check Payment Systems Association (CPSA) recommended features using
 * built-in canvas primitives. Coordinates are relative to the check's
 * top-left corner.
 *
 * Security features baked into every check produced by this layout:
 *
 *   1. Outer + inner security borders (CPSA "intricate border design")
 *   2. Microprinted top + bottom bands ("ORIGINAL DOCUMENT · DO NOT COPY")
 *   3. Microprinted signature line ("AUTHORIZEDSIGNATURE" repeated under a hairline)
 *   4. Microprinted memo line ("MEMO·MEMO·MEMO" repeated under a hairline)
 *   5. Void pantograph — diagonal "VOID" pattern in light gray; engineered
 *      VOID-pantograph stock is what actually breaks down on photocopy, but
 *      the digital pattern declares intent and is hard to perfectly remove
 *   6. Padlock icon + security-feature legend (CPSA-recommended consumer
 *      disclosure of features)
 *   7. Stale-date warning ("VOID AFTER 90 DAYS")
 *   8. Maximum-amount notice ("NOT VALID OVER $50,000.00")
 *   9. Two-signature-required notice over $1,000
 *  10. Amount protection (asterisks via `securityFont: 'amount-protect'`)
 *  11. ANSI-compliant MICR line in the bottom 5/8" clear band
 *  12. Endorsement-zone hint ("ENDORSE BACK")
 *
 * Physical features (true watermark, fluorescent fibers, chemical reactivity,
 * toner-anchorage, micro-fluorescent fibers) come from the underlying paper
 * stock. The legend in #6 names them so the bearer can verify them.
 */

const inch = (n: number): number => toPoints(n, 'inch');

const id = (suffix: string, n: number): CanvasObjectId =>
  `obj_sec_${suffix}_${n.toString(36)}` as CanvasObjectId;

interface BuildOptions {
  /** Tag added to all object IDs to avoid collisions when embedded multiple times. */
  readonly idPrefix?: string;
  /** Top-right warning amount. Default $50,000.00. */
  readonly maxAmountText?: string;
  /** Stale-date warning. Default "VOID AFTER 90 DAYS". */
  readonly staleDateText?: string;
  /** Two-signature-threshold legal text. Default $1,000.00. */
  readonly twoSignatureText?: string;
}

/**
 * Build the canvas objects for one fully security-featured business check.
 * Coordinates assume an 8.5" × 3.5" check (Stocks['business-3up'] etc.).
 */
export function buildSecurityCheckObjects(opts: BuildOptions = {}): CanvasObject[] {
  const prefix = opts.idPrefix ?? 'std';
  const maxAmount = opts.maxAmountText ?? 'NOT VALID FOR AMOUNTS OVER $50,000.00';
  const staleDate = opts.staleDateText ?? 'VOID AFTER 90 DAYS';
  const twoSig = opts.twoSignatureText ?? 'TWO SIGNATURES REQUIRED ABOVE $1,000.00';

  let n = 0;
  const next = (suffix: string): CanvasObjectId => id(`${prefix}_${suffix}`, ++n);

  const objects: CanvasObject[] = [];

  // ── Layer 0: pantograph background ──
  // Light-grey rotated "VOID" tiled across the face of the check. On the
  // canvas the result reads as a soft watermark; on a photocopy made from
  // a real engineered void-pantograph stock the words become bold. We're
  // not engineering halftone screens here, but the artwork declares intent
  // and provides a tamper-evident visual baseline.
  const pantoCols = 8;
  const pantoRows = 5;
  const pantoCellW = inch(8.5) / pantoCols;
  const pantoCellH = inch(3.5) / pantoRows;
  for (let row = 0; row < pantoRows; row++) {
    for (let col = 0; col < pantoCols; col++) {
      objects.push({
        id: next(`panto_${row}_${col}`),
        kind: 'text',
        name: `Pantograph ${row}.${col}`,
        position: {
          x: col * pantoCellW + pantoCellW * 0.1,
          y: row * pantoCellH + pantoCellH * 0.5,
        },
        size: { width: pantoCellW * 0.9, height: pantoCellH * 0.5 },
        rotation: -22,
        locked: true,
        visible: true,
        zIndex: 0,
        value: { kind: 'literal', text: 'VOID  ORIGINAL  VOID  ORIGINAL' },
        fontFamily: 'Inter',
        fontSize: 9,
        fontWeight: 'bold',
        italic: false,
        underline: false,
        color: '#eef0f3',
        justification: 'left',
        lineHeight: 1.2,
        letterSpacing: 1,
      });
    }
  }

  // ── Layer 1: security borders ──
  // Outer navy border just inside the cut edge.
  objects.push({
    id: next('border_outer'),
    kind: 'shape',
    name: 'Security Border (outer)',
    position: { x: inch(0.08), y: inch(0.08) },
    size: { width: inch(8.5) - inch(0.16), height: inch(3.5) - inch(0.16) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 1,
    shape: 'rectangle',
    strokeColor: '#0e2a4a',
    strokeWidth: 1,
    cornerRadius: 4,
  });
  // Inner hairline border for the engraved double-rule effect.
  objects.push({
    id: next('border_inner'),
    kind: 'shape',
    name: 'Security Border (inner)',
    position: { x: inch(0.14), y: inch(0.14) },
    size: { width: inch(8.5) - inch(0.28), height: inch(3.5) - inch(0.28) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 1,
    shape: 'rectangle',
    strokeColor: '#0e2a4a',
    strokeWidth: 0.4,
    cornerRadius: 3,
  });

  // ── Layer 2: microprinted top + bottom bands ──
  // 3.6pt text reading as a fine line at viewing distance, but legible
  // (with a loupe) as the literal phrase. Photocopiers cannot resolve the
  // glyphs; counterfeits show a broken or blurred line.
  const microTopBottomText =
    'AUTHORIZED · ORIGINAL DOCUMENT · DO NOT COPY · ' +
    'AUTHORIZED · ORIGINAL DOCUMENT · DO NOT COPY · ' +
    'AUTHORIZED · ORIGINAL DOCUMENT · DO NOT COPY · ' +
    'AUTHORIZED · ORIGINAL DOCUMENT · DO NOT COPY · ' +
    'AUTHORIZED · ORIGINAL DOCUMENT · DO NOT COPY';
  objects.push({
    id: next('microprint_top'),
    kind: 'text',
    name: 'Microprint (top)',
    position: { x: inch(0.2), y: inch(0.18) },
    size: { width: inch(8.1), height: inch(0.08) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 2,
    value: { kind: 'literal', text: microTopBottomText },
    fontFamily: 'Inter',
    fontSize: 3.6,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#0e2a4a',
    justification: 'left',
    lineHeight: 1,
    letterSpacing: 0.2,
  });

  // ── Header block: company / bank / check number ──
  objects.push({
    id: next('company_name'),
    kind: 'text',
    name: 'Company Name',
    position: { x: inch(0.4), y: inch(0.32) },
    size: { width: inch(3.5), height: inch(0.3) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: 'Your Company, Inc.' },
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: 'bold',
    italic: false,
    underline: false,
    color: '#0e2a4a',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
  });
  objects.push({
    id: next('company_address'),
    kind: 'text',
    name: 'Company Address',
    position: { x: inch(0.4), y: inch(0.62) },
    size: { width: inch(3.5), height: inch(0.6) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: '123 Example St.\nCity, State 00000\n(555) 555-0100' },
    fontFamily: 'Inter',
    fontSize: 8.5,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#333333',
    justification: 'left',
    lineHeight: 1.3,
    letterSpacing: 0,
  });
  objects.push({
    id: next('bank_name'),
    kind: 'text',
    name: 'Bank Name',
    position: { x: inch(4.4), y: inch(0.32) },
    size: { width: inch(2.5), height: inch(0.28) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: 'Bank Name, N.A.' },
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: 'semibold',
    italic: false,
    underline: false,
    color: '#0e2a4a',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
  });
  objects.push({
    id: next('bank_address'),
    kind: 'text',
    name: 'Bank Address',
    position: { x: inch(4.4), y: inch(0.6) },
    size: { width: inch(2.5), height: inch(0.4) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: 'Bank address line 1\nCity, State 00000' },
    fontFamily: 'Inter',
    fontSize: 8.5,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#333333',
    justification: 'left',
    lineHeight: 1.3,
    letterSpacing: 0,
  });
  objects.push({
    id: next('check_number'),
    kind: 'text',
    name: 'Check Number',
    position: { x: inch(7.0), y: inch(0.32) },
    size: { width: inch(1.3), height: inch(0.3) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'label-field', field: 'SerialNumber' },
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: 'bold',
    italic: false,
    underline: false,
    color: '#0e2a4a',
    justification: 'right',
    lineHeight: 1.2,
    letterSpacing: 0,
  });
  objects.push({
    id: next('check_number_label'),
    kind: 'text',
    name: 'Check # Label',
    position: { x: inch(7.0), y: inch(0.6) },
    size: { width: inch(1.3), height: inch(0.18) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: 'CHECK NO.' },
    fontFamily: 'Inter',
    fontSize: 7,
    fontWeight: 'medium',
    italic: false,
    underline: false,
    color: '#666666',
    justification: 'right',
    lineHeight: 1.2,
    letterSpacing: 1.5,
  });

  // Stale-date warning, top-right under the check number.
  objects.push({
    id: next('stale_date'),
    kind: 'text',
    name: 'Stale-date Warning',
    position: { x: inch(7.0), y: inch(0.78) },
    size: { width: inch(1.3), height: inch(0.16) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: staleDate },
    fontFamily: 'Inter',
    fontSize: 6.5,
    fontWeight: 'bold',
    italic: false,
    underline: false,
    color: '#a31515',
    justification: 'right',
    lineHeight: 1.2,
    letterSpacing: 0.5,
  });

  // ── Date row ──
  objects.push({
    id: next('date_label'),
    kind: 'text',
    name: 'Date Label',
    position: { x: inch(5.7), y: inch(1.05) },
    size: { width: inch(0.5), height: inch(0.22) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: 'DATE' },
    fontFamily: 'Inter',
    fontSize: 8,
    fontWeight: 'medium',
    italic: false,
    underline: false,
    color: '#666666',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 1,
  });
  objects.push({
    id: next('date_value'),
    kind: 'text',
    name: 'Date Value',
    position: { x: inch(6.2), y: inch(1.05) },
    size: { width: inch(2.0), height: inch(0.22) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'formula', formula: 'Date()' },
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#000000',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
  });
  objects.push({
    id: next('date_underline'),
    kind: 'shape',
    name: 'Date Underline',
    position: { x: inch(6.2), y: inch(1.27) },
    size: { width: inch(1.85), height: 1 },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 2,
    shape: 'line',
    strokeColor: '#666666',
    strokeWidth: 0.5,
    cornerRadius: 0,
  });

  // ── Pay-to-the-order-of row ──
  objects.push({
    id: next('pay_to_label'),
    kind: 'text',
    name: 'Pay To Label',
    position: { x: inch(0.4), y: inch(1.45) },
    size: { width: inch(1.5), height: inch(0.3) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: 'PAY TO THE\nORDER OF' },
    fontFamily: 'Inter',
    fontSize: 8,
    fontWeight: 'medium',
    italic: false,
    underline: false,
    color: '#666666',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 1,
  });
  objects.push({
    id: next('payee_name'),
    kind: 'text',
    name: 'Payee',
    position: { x: inch(1.7), y: inch(1.5) },
    size: { width: inch(4.5), height: inch(0.3) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'label-field', field: 'Payee' },
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#000000',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
  });
  objects.push({
    id: next('payee_underline'),
    kind: 'shape',
    name: 'Payee Underline',
    position: { x: inch(1.7), y: inch(1.78) },
    size: { width: inch(4.5), height: 1 },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 2,
    shape: 'line',
    strokeColor: '#666666',
    strokeWidth: 0.5,
    cornerRadius: 0,
  });

  // Amount box (numeric) — uses securityFont 'amount-protect' which prefixes
  // the value with asterisks (e.g. "***1,234.56") to defeat amount alteration.
  objects.push({
    id: next('amount_box'),
    kind: 'amount-box',
    name: 'Amount Box',
    position: { x: inch(6.4), y: inch(1.5) },
    size: { width: inch(1.7), height: inch(0.32) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'label-field', field: 'Amount' },
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    justification: 'right',
    securityFont: 'amount-protect',
    showCurrencySymbol: true,
  });
  // Box around amount — emphasizes the bordered amount field.
  objects.push({
    id: next('amount_box_border'),
    kind: 'shape',
    name: 'Amount Box Border',
    position: { x: inch(6.35), y: inch(1.46) },
    size: { width: inch(1.78), height: inch(0.4) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 2,
    shape: 'rectangle',
    strokeColor: '#0e2a4a',
    strokeWidth: 0.5,
    cornerRadius: 2,
  });

  // ── Written amount line ──
  objects.push({
    id: next('amount_words'),
    kind: 'text',
    name: 'Amount in Words',
    position: { x: inch(0.4), y: inch(1.95) },
    size: { width: inch(6.2), height: inch(0.28) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'label-field', field: 'AmountWords' },
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#000000',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
  });
  objects.push({
    id: next('amount_words_underline'),
    kind: 'shape',
    name: 'Amount-Words Underline',
    position: { x: inch(0.4), y: inch(2.23) },
    size: { width: inch(6.2), height: 1 },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 2,
    shape: 'line',
    strokeColor: '#666666',
    strokeWidth: 0.5,
    cornerRadius: 0,
  });
  objects.push({
    id: next('dollars_label'),
    kind: 'text',
    name: 'Dollars Label',
    position: { x: inch(6.7), y: inch(1.97) },
    size: { width: inch(1.3), height: inch(0.22) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: 'DOLLARS' },
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: 'medium',
    italic: false,
    underline: false,
    color: '#666666',
    justification: 'right',
    lineHeight: 1.2,
    letterSpacing: 1,
  });

  // ── Maximum-amount notice + security legend (between amount-words and memo) ──
  objects.push({
    id: next('max_amount_notice'),
    kind: 'text',
    name: 'Max Amount Notice',
    position: { x: inch(0.4), y: inch(2.32) },
    size: { width: inch(4.5), height: inch(0.14) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: maxAmount },
    fontFamily: 'Inter',
    fontSize: 6.5,
    fontWeight: 'bold',
    italic: false,
    underline: false,
    color: '#a31515',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 0.5,
  });
  // Padlock + features legend.
  objects.push({
    id: next('security_legend'),
    kind: 'text',
    name: 'Security Legend',
    position: { x: inch(0.4), y: inch(2.46) },
    size: { width: inch(4.5), height: inch(0.16) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 3,
    value: {
      kind: 'literal',
      text:
        '\u{1F512}  Microprint border · Pantograph background · ' +
        'Chemically reactive paper · Toner-bonded image · MICR encoded',
    },
    fontFamily: 'Inter',
    fontSize: 5.8,
    fontWeight: 'medium',
    italic: false,
    underline: false,
    color: '#0e2a4a',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 0.2,
  });

  // ── Memo + signature block ──
  objects.push({
    id: next('memo_label'),
    kind: 'text',
    name: 'Memo Label',
    position: { x: inch(0.4), y: inch(2.7) },
    size: { width: inch(0.5), height: inch(0.22) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: 'MEMO' },
    fontFamily: 'Inter',
    fontSize: 8,
    fontWeight: 'medium',
    italic: false,
    underline: false,
    color: '#666666',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 1,
  });
  objects.push({
    id: next('memo_value'),
    kind: 'text',
    name: 'Memo',
    position: { x: inch(0.95), y: inch(2.7) },
    size: { width: inch(3.4), height: inch(0.22) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'label-field', field: 'Memo' },
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#000000',
    justification: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
  });
  // Microprinted memo line — hairline above + repeated micro-text below.
  objects.push({
    id: next('memo_line_hairline'),
    kind: 'shape',
    name: 'Memo Line (hairline)',
    position: { x: inch(0.95), y: inch(2.94) },
    size: { width: inch(3.4), height: 1 },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 2,
    shape: 'line',
    strokeColor: '#666666',
    strokeWidth: 0.5,
    cornerRadius: 0,
  });
  objects.push({
    id: next('memo_microprint'),
    kind: 'text',
    name: 'Memo Microprint',
    position: { x: inch(0.95), y: inch(2.96) },
    size: { width: inch(3.4), height: inch(0.06) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 2,
    value: {
      kind: 'literal',
      text:
        'MEMO · MEMO · MEMO · MEMO · MEMO · MEMO · MEMO · MEMO · MEMO · MEMO · ' +
        'MEMO · MEMO · MEMO · MEMO · MEMO · MEMO · MEMO · MEMO',
    },
    fontFamily: 'Inter',
    fontSize: 3.4,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#0e2a4a',
    justification: 'left',
    lineHeight: 1,
    letterSpacing: 0.1,
  });

  // Signature line — hairline + microprinted "AUTHORIZED SIGNATURE".
  objects.push({
    id: next('sig_line_hairline'),
    kind: 'shape',
    name: 'Signature Line (hairline)',
    position: { x: inch(5.0), y: inch(2.94) },
    size: { width: inch(3.0), height: 1 },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 2,
    shape: 'line',
    strokeColor: '#666666',
    strokeWidth: 0.5,
    cornerRadius: 0,
  });
  objects.push({
    id: next('sig_microprint'),
    kind: 'text',
    name: 'Signature Microprint',
    position: { x: inch(5.0), y: inch(2.96) },
    size: { width: inch(3.0), height: inch(0.06) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 2,
    value: {
      kind: 'literal',
      text:
        'AUTHORIZEDSIGNATURE·AUTHORIZEDSIGNATURE·AUTHORIZEDSIGNATURE·' +
        'AUTHORIZEDSIGNATURE·AUTHORIZEDSIGNATURE·AUTHORIZEDSIGNATURE',
    },
    fontFamily: 'Inter',
    fontSize: 3.4,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#0e2a4a',
    justification: 'left',
    lineHeight: 1,
    letterSpacing: 0.1,
  });
  objects.push({
    id: next('sig_authorization'),
    kind: 'text',
    name: 'Authorized Signature Label',
    position: { x: inch(5.0), y: inch(3.04) },
    size: { width: inch(3.0), height: inch(0.16) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: 'AUTHORIZED SIGNATURE' },
    fontFamily: 'Inter',
    fontSize: 7,
    fontWeight: 'medium',
    italic: false,
    underline: false,
    color: '#666666',
    justification: 'center',
    lineHeight: 1.2,
    letterSpacing: 1.5,
  });

  // Two-signature notice between memo and signature blocks.
  objects.push({
    id: next('two_sig_notice'),
    kind: 'text',
    name: 'Two-Signature Notice',
    position: { x: inch(5.0), y: inch(2.7) },
    size: { width: inch(3.0), height: inch(0.16) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 3,
    value: { kind: 'literal', text: twoSig },
    fontFamily: 'Inter',
    fontSize: 6.5,
    fontWeight: 'bold',
    italic: false,
    underline: false,
    color: '#a31515',
    justification: 'center',
    lineHeight: 1.2,
    letterSpacing: 0.5,
  });

  // ── Bottom microprint band, just above the MICR clear band ──
  objects.push({
    id: next('microprint_bottom'),
    kind: 'text',
    name: 'Microprint (bottom)',
    position: { x: inch(0.2), y: inch(3.235) },
    size: { width: inch(8.1), height: inch(0.06) },
    rotation: 0,
    locked: true,
    visible: true,
    zIndex: 2,
    value: { kind: 'literal', text: microTopBottomText },
    fontFamily: 'Inter',
    fontSize: 3.4,
    fontWeight: 'regular',
    italic: false,
    underline: false,
    color: '#0e2a4a',
    justification: 'left',
    lineHeight: 1,
    letterSpacing: 0.2,
  });

  // ── MICR clear band — bottom 5/8" of the check ──
  objects.push({
    id: next('micr'),
    kind: 'micr',
    name: 'MICR Line',
    position: { x: inch(0.5), y: inch(3.05) },
    size: { width: inch(7.5), height: inch(0.3) },
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 5,
    value: { kind: 'literal', text: '' },
    fontVariant: 'e13b',
    fontSize: 12,
    color: '#000000',
    justification: 'left',
  });

  return objects;
}
