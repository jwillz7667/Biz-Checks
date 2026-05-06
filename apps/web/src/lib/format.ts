/**
 * Formatting helpers shared across the UI. Currency amounts arrive as
 * stringified BigInt minor units (cents), so we never coerce to JS Number
 * for the integer side — only the display split.
 */

export function formatMinor(minor: string | number | bigint, currency = 'USD'): string {
  const minorBig = typeof minor === 'bigint' ? minor : BigInt(minor);
  const negative = minorBig < 0n;
  const abs = negative ? -minorBig : minorBig;
  const major = abs / 100n;
  const cents = abs % 100n;
  const integer = major
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${currencySymbol(currency)}${integer}.${cents
    .toString()
    .padStart(2, '0')}`;
}

export function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'USD':
    case 'CAD':
    case 'AUD':
      return '$';
    case 'GBP':
      return '£';
    case 'EUR':
      return '€';
    default:
      return '';
  }
}

export function formatDate(iso: string | Date | null): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | Date | null): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function parseDollarsToMinor(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const negative = cleaned.startsWith('-');
  const abs = negative ? cleaned.slice(1) : cleaned;
  const [whole, fraction = ''] = abs.split('.');
  const cents = (whole ?? '0') + (fraction + '00').slice(0, 2);
  const value = Number(cents);
  if (!Number.isFinite(value) || !Number.isSafeInteger(value)) return null;
  return negative ? -value : value;
}

export function clientId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}_${rand.replace(/-/g, '').slice(0, 16)}`;
}
