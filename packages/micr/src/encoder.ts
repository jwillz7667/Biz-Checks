import { DomainError, err, ok, type Result } from '@biz-checks/domain';

import {
  fallbackFor,
  glyphFor,
  isE13BPrintable,
  isE13BGlyphOrDigit,
  type MICRSymbol,
  toFallbacks,
  toGlyphs,
} from './characters.js';
import { validateRoutingNumber } from './routing.js';

export interface MICRLineSpec {
  /** Auxiliary on-us field, optional, leftmost on US business checks. */
  readonly auxOnUs?: string;
  /** EPC code: 4-digit external processing code, optional. */
  readonly epc?: string;
  readonly routing: string;
  /** Account number, digits only, no leading transit. */
  readonly account: string;
  /** Transaction code or trailing serial number (US business checks). */
  readonly serial: string;
  /** Render style — Unicode glyphs (preferred) or ASCII fallbacks. */
  readonly style?: 'glyph' | 'fallback';
}

/**
 * Render a structured MICR line spec into the canonical printable form.
 *
 * Standard US business check (X9.100-160) layout from right-to-left as
 * printed (the bottom of the check is read right-to-left by sorters):
 *
 *   ⑆ routing ⑆  account  ⑈ serial ⑈
 *
 * In source order (left-to-right, as we lay out on the canvas):
 *
 *   ⑆ routing ⑆  account  ⑈ serial ⑈
 *
 * Some stocks place the serial on the left flanked by ⑈; we accept either
 * by allowing the caller to construct the layout via the encoder builder.
 */
export function encodeMICRLine(spec: MICRLineSpec): Result<string, DomainError> {
  const routing = validateRoutingNumber(spec.routing);
  if (!routing.ok) return routing;

  if (!/^\d{4,17}$/.test(spec.account)) {
    return err(
      new DomainError('MICR_INVALID', 'Account number must be 4-17 digits', {
        details: { fieldLength: spec.account.length },
      }),
    );
  }
  if (!/^\d{1,15}$/.test(spec.serial)) {
    return err(new DomainError('MICR_INVALID', 'Serial/trans field must be 1-15 digits'));
  }
  if (spec.auxOnUs !== undefined && !/^\d{0,15}$/.test(spec.auxOnUs)) {
    return err(new DomainError('MICR_INVALID', 'Auxiliary on-us must be up to 15 digits'));
  }
  if (spec.epc !== undefined && !/^\d{0,4}$/.test(spec.epc)) {
    return err(new DomainError('MICR_INVALID', 'EPC must be 0-4 digits'));
  }

  const transit = symbol('transit', spec.style);
  const onUs = symbol('on-us', spec.style);

  const parts: string[] = [];
  if (spec.auxOnUs) parts.push(`${onUs}${spec.auxOnUs}${onUs}`);
  if (spec.epc) parts.push(spec.epc);
  parts.push(`${transit}${routing.value}${transit}`);
  parts.push(spec.account);
  parts.push(`${onUs}${spec.serial}${onUs}`);

  return ok(parts.join(' '));
}

function symbol(s: MICRSymbol, style: MICRLineSpec['style']): string {
  return style === 'fallback' ? fallbackFor(s) : glyphFor(s);
}

/**
 * Re-render an existing MICR line in glyph form, regardless of the
 * source style (accepts mixed glyph/fallback input).
 */
export function normalizeToGlyphs(line: string): string {
  return toGlyphs(line);
}

/** Re-render an existing MICR line in fallback form. */
export function normalizeToFallbacks(line: string): string {
  return toFallbacks(line);
}

/** Returns the count of printable E-13B characters (excluding spaces). */
export function micrCharCount(line: string): number {
  let n = 0;
  for (const c of line) {
    if (c !== ' ' && isE13BPrintable(c)) n += 1;
  }
  return n;
}

/**
 * Strip every non-MICR character. Keeps digits, spaces, and the four
 * Unicode E-13B glyphs. ASCII fallback letters (A/B/C/D) are deliberately
 * stripped because they're ambiguous with ordinary text — convert via
 * `normalizeToGlyphs` first if you want to preserve them.
 */
export function stripNonMICR(line: string): string {
  let out = '';
  for (const c of line) {
    if (isE13BGlyphOrDigit(c) || c === ' ') out += c;
  }
  return out;
}

/** Re-export so callers can probe individual characters in mixed input. */
export { isE13BPrintable };
