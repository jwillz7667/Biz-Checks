/**
 * Allocate a contiguous range of serial numbers, returned as an array.
 *
 * For atomicity in the database, callers should use `nextval()`-style
 * allocation in a transaction; this helper exists for in-memory testing
 * and for client-side previews where strict atomicity is not required.
 */
export function allocateSerials(start: number, count: number, step = 1, pad = 0): string[] {
  if (start < 1) throw new RangeError('Start must be >= 1');
  if (count < 1) throw new RangeError('Count must be >= 1');
  if (step < 1) throw new RangeError('Step must be >= 1');

  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const n = start + i * step;
    out.push(pad > 0 ? String(n).padStart(pad, '0') : String(n));
  }
  return out;
}

export function nextSerial(current: number, step = 1, count = 1): number {
  return current + step * count;
}
