import { z } from 'zod';

export type CurrencyCode = 'USD' | 'CAD' | 'GBP' | 'EUR' | 'AUD';
export const CurrencyCodeSchema = z.enum(['USD', 'CAD', 'GBP', 'EUR', 'AUD']);

/**
 * Money is stored as integer minor units (cents) to eliminate float drift.
 * Always paired with a currency code.
 */
export interface Money {
  readonly minorUnits: number;
  readonly currency: CurrencyCode;
}

export const MoneySchema = z.object({
  minorUnits: z.number().int().nonnegative().finite(),
  currency: CurrencyCodeSchema,
});

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  CAD: '$',
  GBP: '£',
  EUR: '€',
  AUD: '$',
};

export function moneyFromMajor(major: number, currency: CurrencyCode): Money {
  return { minorUnits: Math.round(major * 100), currency };
}

export function moneyToMajor(money: Money): number {
  return money.minorUnits / 100;
}

export function formatMoney(money: Money, opts: { symbol?: boolean } = {}): string {
  const major = moneyToMajor(money);
  const formatted = major.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return opts.symbol === false ? formatted : `${SYMBOLS[money.currency]}${formatted}`;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES = ['', 'Thousand', 'Million', 'Billion'];

function chunkToWords(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n] ?? '';
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${TENS[tens] ?? ''}${ones > 0 ? `-${ONES[ones] ?? ''}` : ''}`;
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return `${ONES[hundreds] ?? ''} Hundred${rest > 0 ? ` ${chunkToWords(rest)}` : ''}`;
}

/**
 * Convert money to legal-tender words for the written-amount line on a check.
 * Example: $1,234.56 → "One Thousand Two Hundred Thirty-Four and 56/100"
 */
export function moneyToWords(money: Money): string {
  if (money.minorUnits < 0) throw new Error('Cannot render negative money to words');

  const major = Math.floor(money.minorUnits / 100);
  const minor = money.minorUnits % 100;

  if (major === 0) return `Zero and ${minor.toString().padStart(2, '0')}/100`;

  let n = major;
  const parts: string[] = [];
  let scaleIdx = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const chunkWords = chunkToWords(chunk);
      const scale = SCALES[scaleIdx];
      parts.unshift(scale ? `${chunkWords} ${scale}` : chunkWords);
    }
    n = Math.floor(n / 1000);
    scaleIdx += 1;
  }
  const dollars = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${dollars} and ${minor.toString().padStart(2, '0')}/100`;
}
