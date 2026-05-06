import { DomainError, err, ok, type Result } from '@biz-checks/domain';

import { isE13BPrintable, symbolFromChar } from './characters.js';

export interface MICRValidationIssue {
  readonly code: 'invalid-character' | 'no-routing' | 'no-account' | 'unbalanced-symbols';
  readonly message: string;
  readonly position?: number;
}

export interface MICRValidationReport {
  readonly valid: boolean;
  readonly issues: readonly MICRValidationIssue[];
  readonly stats: {
    readonly digits: number;
    readonly transits: number;
    readonly onUs: number;
    readonly amounts: number;
    readonly dashes: number;
    readonly spaces: number;
  };
}

/**
 * Lint a rendered MICR line. Used by the designer to surface real-time
 * errors as the user edits a formula.
 */
export function lintMICRLine(line: string): MICRValidationReport {
  const issues: MICRValidationIssue[] = [];
  const stats = { digits: 0, transits: 0, onUs: 0, amounts: 0, dashes: 0, spaces: 0 };

  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === undefined) continue;
    if (c === ' ') {
      stats.spaces += 1;
      continue;
    }
    if (c >= '0' && c <= '9') {
      stats.digits += 1;
      continue;
    }
    const sym = symbolFromChar(c);
    if (sym === 'transit') stats.transits += 1;
    else if (sym === 'on-us') stats.onUs += 1;
    else if (sym === 'amount') stats.amounts += 1;
    else if (sym === 'dash') stats.dashes += 1;
    else if (!isE13BPrintable(c)) {
      issues.push({
        code: 'invalid-character',
        message: `Character "${c}" is not a valid E-13B symbol`,
        position: i,
      });
    }
  }

  if (stats.transits % 2 !== 0) {
    issues.push({
      code: 'unbalanced-symbols',
      message: 'Transit symbols must come in pairs (open and close brackets)',
    });
  }
  if (stats.onUs % 2 !== 0) {
    issues.push({
      code: 'unbalanced-symbols',
      message: 'On-Us symbols must come in pairs (open and close brackets)',
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    stats,
  };
}

export function assertMICRLine(line: string): Result<string, DomainError> {
  const report = lintMICRLine(line);
  if (report.valid) return ok(line);
  return err(
    new DomainError('MICR_INVALID', 'MICR line failed validation', {
      details: { issues: report.issues },
    }),
  );
}
