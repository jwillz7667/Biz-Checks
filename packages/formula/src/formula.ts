import { DomainError, err, ok, type Result } from '@biz-checks/domain';

import { evaluate, type EvalContext, type FormulaValue } from './evaluator.js';
import { parse } from './parser.js';
import { FormulaError } from './tokens.js';

/**
 * Compile a formula source string once and reuse the resulting evaluator
 * to render the formula across many label rows. Parsing is the expensive
 * step; evaluation is cheap.
 */
export function compile(source: string): Result<(ctx: EvalContext) => string, DomainError> {
  try {
    const ast = parse(source);
    return ok((ctx) => stringifyResult(evaluate(ast, ctx)));
  } catch (e) {
    if (e instanceof FormulaError) {
      return err(
        new DomainError('FORMULA_PARSE_ERROR', e.message, {
          details: { position: e.position, source },
        }),
      );
    }
    throw e;
  }
}

/** One-shot helper for cases where the formula will only run once. */
export function evaluateFormula(source: string, ctx: EvalContext): Result<string, DomainError> {
  const compiled = compile(source);
  if (!compiled.ok) return compiled;
  try {
    return ok(compiled.value(ctx));
  } catch (e) {
    if (e instanceof FormulaError) {
      return err(
        new DomainError(e.code === 'PARSE' ? 'FORMULA_PARSE_ERROR' : 'FORMULA_RUNTIME_ERROR', e.message, {
          details: { position: e.position, source },
        }),
      );
    }
    throw e;
  }
}

function stringifyResult(v: FormulaValue): string {
  if (typeof v === 'number') {
    // Render integers without trailing .0
    return Number.isInteger(v) ? v.toString() : v.toString();
  }
  return v;
}
