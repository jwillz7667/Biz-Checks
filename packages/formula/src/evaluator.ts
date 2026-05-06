import { FormulaError } from './tokens.js';

import type { Expr } from './ast.js';

export type FormulaValue = string | number;

export interface EvalContext {
  /**
   * 1-based current label/check number — equivalent to L# in legacy formulas.
   */
  readonly labelNumber: number;
  /**
   * Total labels in the print run — T#.
   */
  readonly totalLabels: number;
  /**
   * Resolves a named label field to its current string value
   * (includes incremented serial numbers, constants, and computed values).
   */
  readonly labelField: (name: string) => string | undefined;
  /**
   * Resolves a 1-based column index from the linked data source.
   */
  readonly dataField: (columnIndex: number) => FormulaValue | undefined;
  /**
   * Resolves a column by its name.
   */
  readonly dataFieldByName: (columnName: string) => FormulaValue | undefined;
  /**
   * Time anchor — defaults to 'now' but injectable for deterministic tests
   * and reproducible audit-trail rendering.
   */
  readonly now?: Date;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const VBCRLF = '\r\n';

export function evaluate(expr: Expr, ctx: EvalContext): FormulaValue {
  return evalExpr(expr, ctx);
}

function evalExpr(e: Expr, ctx: EvalContext): FormulaValue {
  switch (e.type) {
    case 'number':
      return e.value;
    case 'string':
      return e.value;
    case 'variable':
      return e.name === 'L#' ? ctx.labelNumber : ctx.totalLabels;
    case 'identifier':
      return resolveIdentifier(e.name, ctx);
    case 'unary': {
      const operand = toNumber(evalExpr(e.operand, ctx));
      return e.op === '-' ? -operand : operand;
    }
    case 'binary':
      return evalBinary(e.op, evalExpr(e.left, ctx), evalExpr(e.right, ctx));
    case 'call':
      return evalCall(e.callee, e.args.map((a) => evalExpr(a, ctx)), ctx);
  }
}

function resolveIdentifier(name: string, _ctx: EvalContext): FormulaValue {
  if (name === 'VBCRLF') return VBCRLF;
  throw new FormulaError('RUNTIME', `Undefined identifier "${name}"`);
}

function evalBinary(op: '+' | '-' | '*' | '/' | '&', l: FormulaValue, r: FormulaValue): FormulaValue {
  if (op === '&') return toString(l) + toString(r);

  // VB-style: + with strings concatenates; otherwise both operands must be numeric.
  if (op === '+' && (typeof l === 'string' || typeof r === 'string')) {
    return toString(l) + toString(r);
  }

  const ln = toNumber(l);
  const rn = toNumber(r);
  switch (op) {
    case '+':
      return ln + rn;
    case '-':
      return ln - rn;
    case '*':
      return ln * rn;
    case '/':
      if (rn === 0) throw new FormulaError('RUNTIME', 'Division by zero');
      return ln / rn;
  }
}

function evalCall(name: string, args: FormulaValue[], ctx: EvalContext): FormulaValue {
  const fn = name; // case-sensitive — legacy formulas use exact case
  const now = ctx.now ?? new Date();

  switch (fn) {
    case 'Date':
      return formatUSDate(now);
    case 'Time':
      return formatUSTime(now);
    case 'Year':
      return now.getFullYear();
    case 'Month':
      return now.getMonth() + 1;
    case 'MonthName': {
      const idx = now.getMonth();
      const name = MONTH_NAMES[idx];
      if (!name) throw new FormulaError('RUNTIME', `Invalid month index ${idx}`);
      return name;
    }
    case 'Day':
      return now.getDate();
    case 'DayName': {
      const idx = now.getDay();
      const name = DAY_NAMES[idx];
      if (!name) throw new FormulaError('RUNTIME', `Invalid day index ${idx}`);
      return name;
    }
    case 'LabelField': {
      const argName = args[0];
      if (typeof argName !== 'string') {
        throw new FormulaError('RUNTIME', 'LabelField requires a string argument');
      }
      const value = ctx.labelField(argName);
      if (value === undefined) {
        throw new FormulaError('RUNTIME', `Label field "${argName}" not found`);
      }
      return value;
    }
    case 'Field': {
      const idx = toNumber(args[0] ?? 0);
      const value = ctx.dataField(Math.trunc(idx));
      if (value === undefined) {
        throw new FormulaError('RUNTIME', `Data field at column ${idx} not found`);
      }
      return value;
    }
    case 'FieldName': {
      const colName = args[0];
      if (typeof colName !== 'string') {
        throw new FormulaError('RUNTIME', 'FieldName requires a string argument');
      }
      const value = ctx.dataFieldByName(colName);
      if (value === undefined) {
        throw new FormulaError('RUNTIME', `Data field "${colName}" not found`);
      }
      return value;
    }
    case 'Currency': {
      const value = toNumber(args[0] ?? 0);
      const decimals = args[1] !== undefined ? Math.trunc(toNumber(args[1])) : 2;
      return value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    case 'Pad': {
      const text = toString(args[0] ?? '');
      const width = Math.trunc(toNumber(args[1] ?? 0));
      const fillSrc = args[2];
      const fill = typeof fillSrc === 'string' ? fillSrc : '0';
      if (text.length >= width) return text;
      return fill.repeat(width - text.length) + text;
    }
    case 'Upper':
      return toString(args[0] ?? '').toUpperCase();
    case 'Lower':
      return toString(args[0] ?? '').toLowerCase();
    case 'Trim':
      return toString(args[0] ?? '').trim();
    case 'Len':
      return toString(args[0] ?? '').length;
    case 'Left': {
      const s = toString(args[0] ?? '');
      const n = Math.trunc(toNumber(args[1] ?? 0));
      return s.slice(0, Math.max(0, n));
    }
    case 'Right': {
      const s = toString(args[0] ?? '');
      const n = Math.trunc(toNumber(args[1] ?? 0));
      return n <= 0 ? '' : s.slice(-n);
    }
    case 'Mid': {
      const s = toString(args[0] ?? '');
      const start = Math.max(0, Math.trunc(toNumber(args[1] ?? 1)) - 1);
      const len = args[2] !== undefined ? Math.trunc(toNumber(args[2])) : undefined;
      return len === undefined ? s.slice(start) : s.slice(start, start + len);
    }
    default:
      throw new FormulaError('RUNTIME', `Unknown function "${fn}"`);
  }
}

function toNumber(v: FormulaValue): number {
  if (typeof v === 'number') return v;
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) throw new FormulaError('RUNTIME', `Cannot convert "${v}" to number`);
  return n;
}

function toString(v: FormulaValue): string {
  return typeof v === 'string' ? v : v.toString();
}

function formatUSDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const y = d.getFullYear();
  return `${m}/${dd}/${y}`;
}

function formatUSTime(d: Date): string {
  const h24 = d.getHours();
  const h12 = h24 % 12 || 12;
  const mins = String(d.getMinutes()).padStart(2, '0');
  const period = h24 < 12 ? 'AM' : 'PM';
  return `${h12}:${mins} ${period}`;
}
