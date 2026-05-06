import { DomainError, err, ok, type Result } from '@biz-checks/domain';

/**
 * Validate a 9-digit ABA routing number's checksum per the
 * Federal Reserve formula:
 *   3*(d0+d3+d6) + 7*(d1+d4+d7) + 1*(d2+d5+d8) ≡ 0 (mod 10)
 *
 * The first two digits also encode a Federal Reserve district (00–12 are the
 * legacy "primary" routing prefixes; 21–32 are thrift institutions; etc.).
 * We only validate the checksum here — geographic prefix validation is
 * institution-specific and not all valid routing numbers conform.
 */
export function isValidRoutingChecksum(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  // Degenerate all-zeros passes the mod-10 arithmetic but is not a real
  // routing number; reject it explicitly.
  if (routing === '000000000') return false;
  const d = [...routing].map((c) => Number.parseInt(c, 10));
  const checksum =
    3 * ((d[0] ?? 0) + (d[3] ?? 0) + (d[6] ?? 0)) +
    7 * ((d[1] ?? 0) + (d[4] ?? 0) + (d[7] ?? 0)) +
    1 * ((d[2] ?? 0) + (d[5] ?? 0) + (d[8] ?? 0));
  return checksum % 10 === 0;
}

export function validateRoutingNumber(routing: string): Result<string, DomainError> {
  const normalized = routing.replace(/\s+/g, '');
  if (!/^\d{9}$/.test(normalized)) {
    return err(
      new DomainError('MICR_INVALID', 'Routing number must be exactly 9 digits', {
        details: { length: normalized.length },
      }),
    );
  }
  if (!isValidRoutingChecksum(normalized)) {
    return err(
      new DomainError(
        'ROUTING_CHECKSUM_FAILED',
        'Routing number checksum is invalid (mod-10 ABA test failed)',
      ),
    );
  }
  return ok(normalized);
}

/**
 * Federal Reserve routing-symbol prefix lookup. Returns the bank's Fed
 * district name (rough geographic indicator) — useful for UI hints; not
 * authoritative.
 */
const FED_DISTRICTS: Record<string, string> = {
  '01': 'Boston',
  '02': 'New York',
  '03': 'Philadelphia',
  '04': 'Cleveland',
  '05': 'Richmond',
  '06': 'Atlanta',
  '07': 'Chicago',
  '08': 'St. Louis',
  '09': 'Minneapolis',
  '10': 'Kansas City',
  '11': 'Dallas',
  '12': 'San Francisco',
};

export function fedDistrict(routing: string): string | null {
  if (!/^\d{9}$/.test(routing)) return null;
  const prefix = routing.slice(0, 2);
  return FED_DISTRICTS[prefix] ?? null;
}
