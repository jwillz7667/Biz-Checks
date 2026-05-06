/**
 * MICR E-13B special characters per ANSI X9.27 / X9.100-160.
 *
 * The four control symbols are non-numeric magnetic glyphs printed in the
 * MICR line. Their Unicode code points are taken from the U+2440 "Optical
 * Character Recognition" block. The ASCII fallbacks listed below are the
 * conventional substitutes used by GnuMICR, IDAutomation and similar fonts
 * to map glyphs into typeable characters when the input is keyboard text.
 *
 * Reference: https://www.unicode.org/charts/PDF/U2440.pdf
 */

/** ⑆ Transit (routing-number bracket) */
export const TRANSIT_GLYPH = '⑆';
/** ⑈ On-Us (account/serial bracket) */
export const ON_US_GLYPH = '⑈';
/** ⑇ Amount (rare; brackets dollar amount) */
export const AMOUNT_GLYPH = '⑇';
/** ⑉ Dash (separator) */
export const DASH_GLYPH = '⑉';

/**
 * Conventional ASCII fallbacks used by E-13B fonts.
 * Mapping follows IDAutomation's documented convention (used in the user
 * guide bundled with this project) for compatibility with formulas authored
 * against legacy software.
 */
export const FALLBACK = {
  TRANSIT: 'A',
  ON_US: 'C',
  AMOUNT: 'B',
  DASH: 'D',
} as const;

export type MICRSymbol = 'transit' | 'on-us' | 'amount' | 'dash';

const GLYPH_BY_SYMBOL: Record<MICRSymbol, string> = {
  transit: TRANSIT_GLYPH,
  'on-us': ON_US_GLYPH,
  amount: AMOUNT_GLYPH,
  dash: DASH_GLYPH,
};

const FALLBACK_BY_SYMBOL: Record<MICRSymbol, string> = {
  transit: FALLBACK.TRANSIT,
  'on-us': FALLBACK.ON_US,
  amount: FALLBACK.AMOUNT,
  dash: FALLBACK.DASH,
};

export function glyphFor(symbol: MICRSymbol): string {
  return GLYPH_BY_SYMBOL[symbol];
}

export function fallbackFor(symbol: MICRSymbol): string {
  return FALLBACK_BY_SYMBOL[symbol];
}

const SYMBOL_BY_FALLBACK: ReadonlyMap<string, MICRSymbol> = new Map([
  [FALLBACK.TRANSIT, 'transit'],
  [FALLBACK.ON_US, 'on-us'],
  [FALLBACK.AMOUNT, 'amount'],
  [FALLBACK.DASH, 'dash'],
]);

const SYMBOL_BY_GLYPH: ReadonlyMap<string, MICRSymbol> = new Map([
  [TRANSIT_GLYPH, 'transit'],
  [ON_US_GLYPH, 'on-us'],
  [AMOUNT_GLYPH, 'amount'],
  [DASH_GLYPH, 'dash'],
]);

export function symbolFromChar(c: string): MICRSymbol | null {
  return SYMBOL_BY_GLYPH.get(c) ?? SYMBOL_BY_FALLBACK.get(c.toUpperCase()) ?? null;
}

/**
 * Render a string written with ASCII fallbacks into the canonical MICR
 * Unicode glyphs. Lowercase fallbacks are tolerated.
 */
export function toGlyphs(input: string): string {
  let out = '';
  for (const ch of input) {
    const sym = SYMBOL_BY_FALLBACK.get(ch.toUpperCase());
    out += sym ? GLYPH_BY_SYMBOL[sym] : ch;
  }
  return out;
}

/**
 * Render a glyph-bearing string into ASCII fallbacks. Useful when rendering
 * with a font that lacks the Unicode glyphs (some printer drivers).
 */
export function toFallbacks(input: string): string {
  let out = '';
  for (const ch of input) {
    const sym = SYMBOL_BY_GLYPH.get(ch);
    out += sym ? FALLBACK_BY_SYMBOL[sym] : ch;
  }
  return out;
}

/** All printable E-13B characters: digits + four symbols (glyph or fallback). */
export function isE13BPrintable(c: string): boolean {
  if (c.length !== 1) return false;
  if (c >= '0' && c <= '9') return true;
  if (SYMBOL_BY_GLYPH.has(c)) return true;
  if (SYMBOL_BY_FALLBACK.has(c.toUpperCase())) return true;
  return c === ' ';
}

/**
 * Stricter variant of `isE13BPrintable`: only digits and the four Unicode
 * MICR glyphs (no ASCII fallbacks like 'A'/'B'/'C'/'D'). Used by sanitizers
 * that must reject ordinary letters even when they happen to coincide with
 * fallback glyph aliases.
 */
export function isE13BGlyphOrDigit(c: string): boolean {
  if (c.length !== 1) return false;
  if (c >= '0' && c <= '9') return true;
  return SYMBOL_BY_GLYPH.has(c);
}
