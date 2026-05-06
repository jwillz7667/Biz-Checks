import { describe, expect, it } from 'vitest';

import { evaluateFormula } from './formula.js';

import type { EvalContext } from './evaluator.js';

const ctx = (overrides: Partial<EvalContext> = {}): EvalContext => ({
  labelNumber: 1,
  totalLabels: 1,
  labelField: () => undefined,
  dataField: () => undefined,
  dataFieldByName: () => undefined,
  now: new Date('2026-05-06T14:30:00Z'),
  ...overrides,
});

describe('formula evaluation', () => {
  describe('literals', () => {
    it('strings', () => {
      const r = evaluateFormula('"Hello"', ctx());
      expect(r.ok && r.value).toBe('Hello');
    });

    it('numbers', () => {
      const r = evaluateFormula('42', ctx());
      expect(r.ok && r.value).toBe('42');
    });

    it('floats', () => {
      const r = evaluateFormula('3.14', ctx());
      expect(r.ok && r.value).toBe('3.14');
    });

    it('escaped quotes in strings', () => {
      const r = evaluateFormula('"He said ""hi"""', ctx());
      expect(r.ok && r.value).toBe('He said "hi"');
    });
  });

  describe('arithmetic', () => {
    it('addition', () => {
      const r = evaluateFormula('100 + 1', ctx());
      expect(r.ok && r.value).toBe('101');
    });

    it('multiplication and division', () => {
      const r = evaluateFormula('6 * 7 / 2', ctx());
      expect(r.ok && r.value).toBe('21');
    });

    it('respects precedence (mul before add)', () => {
      const r = evaluateFormula('1 + 2 * 3', ctx());
      expect(r.ok && r.value).toBe('7');
    });

    it('respects parentheses', () => {
      const r = evaluateFormula('(1 + 2) * 3', ctx());
      expect(r.ok && r.value).toBe('9');
    });

    it('unary minus', () => {
      const r = evaluateFormula('-5 + 10', ctx());
      expect(r.ok && r.value).toBe('5');
    });

    it('division by zero is a runtime error', () => {
      const r = evaluateFormula('5 / 0', ctx());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('FORMULA_RUNTIME_ERROR');
    });
  });

  describe('concatenation', () => {
    it('& concatenates strings', () => {
      const r = evaluateFormula('"Hello, " & "world"', ctx());
      expect(r.ok && r.value).toBe('Hello, world');
    });

    it('& concatenates numbers as strings', () => {
      const r = evaluateFormula('"Check #" & 100', ctx());
      expect(r.ok && r.value).toBe('Check #100');
    });

    it('+ with one string operand becomes concatenation (VB-compat)', () => {
      const r = evaluateFormula('"value: " + 42', ctx());
      expect(r.ok && r.value).toBe('value: 42');
    });
  });

  describe('label number variables', () => {
    it('L# returns current label number', () => {
      const r = evaluateFormula('"Check " & L#', ctx({ labelNumber: 5 }));
      expect(r.ok && r.value).toBe('Check 5');
    });

    it('T# returns total labels', () => {
      const r = evaluateFormula('L# & " of " & T#', ctx({ labelNumber: 2, totalLabels: 10 }));
      expect(r.ok && r.value).toBe('2 of 10');
    });

    it('full IDAutomation example: "C" & 100 + L#', () => {
      const r = evaluateFormula('"C" & 100 + L#', ctx({ labelNumber: 3 }));
      expect(r.ok && r.value).toBe('C103');
    });
  });

  describe('label fields', () => {
    it('LabelField resolves named field', () => {
      const r = evaluateFormula('LabelField("ChkNum")', ctx({ labelField: (n) => (n === 'ChkNum' ? '621001' : undefined) }));
      expect(r.ok && r.value).toBe('621001');
    });

    it('classic MICR formula: routing + account + check serial', () => {
      const r = evaluateFormula(
        '"C" & LabelField("SerialNumber") & "C A763591681A 0710527197C"',
        ctx({ labelField: () => '621001' }),
      );
      expect(r.ok && r.value).toBe('C621001C A763591681A 0710527197C');
    });

    it('missing label field is a runtime error', () => {
      const r = evaluateFormula('LabelField("Missing")', ctx());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('FORMULA_RUNTIME_ERROR');
    });
  });

  describe('date / time builtins', () => {
    it('Date() returns mm/dd/yyyy', () => {
      const r = evaluateFormula('Date()', ctx({ now: new Date(2026, 4, 6) }));
      expect(r.ok && r.value).toBe('05/06/2026');
    });

    it('Year() returns 4-digit year', () => {
      const r = evaluateFormula('Year()', ctx({ now: new Date(2026, 4, 6) }));
      expect(r.ok && r.value).toBe('2026');
    });

    it('MonthName() returns May for May date', () => {
      const r = evaluateFormula('MonthName()', ctx({ now: new Date(2026, 4, 6) }));
      expect(r.ok && r.value).toBe('May');
    });

    it('DayName() returns weekday', () => {
      const r = evaluateFormula('DayName()', ctx({ now: new Date(2026, 4, 6) })); // Wed
      expect(r.ok && r.value).toBe('Wednesday');
    });
  });

  describe('Currency()', () => {
    it('formats with 2 decimals by default', () => {
      const r = evaluateFormula('Currency(1234.5)', ctx());
      expect(r.ok && r.value).toBe('1,234.50');
    });

    it('formats with custom decimals', () => {
      const r = evaluateFormula('Currency(1234.567, 3)', ctx());
      expect(r.ok && r.value).toBe('1,234.567');
    });

    it('classic IDAutomation amount formula: "[" & Currency(Field(9),2) & "_USD]"', () => {
      const r = evaluateFormula(
        '"[" & Currency(Field(9), 2) & "_USD]"',
        ctx({ dataField: (i) => (i === 9 ? 1234.5 : undefined) }),
      );
      expect(r.ok && r.value).toBe('[1,234.50_USD]');
    });
  });

  describe('data source fields', () => {
    it('Field(n) reads by 1-based column index', () => {
      const r = evaluateFormula(
        'Field(1) & ":" & Field(2)',
        ctx({ dataField: (i) => (i === 1 ? 'a' : i === 2 ? 'b' : undefined) }),
      );
      expect(r.ok && r.value).toBe('a:b');
    });

    it('FieldName(name) reads by column name', () => {
      const r = evaluateFormula(
        'FieldName("Payee")',
        ctx({ dataFieldByName: (name) => (name === 'Payee' ? 'Acme Corp' : undefined) }),
      );
      expect(r.ok && r.value).toBe('Acme Corp');
    });
  });

  describe('string helpers', () => {
    it('Pad pads with zeros to width', () => {
      const r = evaluateFormula('Pad(L#, 6)', ctx({ labelNumber: 42 }));
      expect(r.ok && r.value).toBe('000042');
    });

    it('Pad with custom fill char', () => {
      const r = evaluateFormula('Pad("X", 4, "*")', ctx());
      expect(r.ok && r.value).toBe('***X');
    });

    it('Upper / Lower / Trim', () => {
      expect(evaluateFormula('Upper("abc")', ctx())).toMatchObject({ ok: true, value: 'ABC' });
      expect(evaluateFormula('Lower("ABC")', ctx())).toMatchObject({ ok: true, value: 'abc' });
      expect(evaluateFormula('Trim(" x ")', ctx())).toMatchObject({ ok: true, value: 'x' });
    });

    it('Left / Right / Mid', () => {
      expect(evaluateFormula('Left("HelloWorld", 5)', ctx())).toMatchObject({
        ok: true,
        value: 'Hello',
      });
      expect(evaluateFormula('Right("HelloWorld", 5)', ctx())).toMatchObject({
        ok: true,
        value: 'World',
      });
      expect(evaluateFormula('Mid("HelloWorld", 6, 3)', ctx())).toMatchObject({
        ok: true,
        value: 'Wor',
      });
    });
  });

  describe('parse errors', () => {
    it('reports unterminated string', () => {
      const r = evaluateFormula('"unterminated', ctx());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('FORMULA_PARSE_ERROR');
    });

    it('reports unbalanced parens', () => {
      const r = evaluateFormula('(1 + 2', ctx());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('FORMULA_PARSE_ERROR');
    });

    it('reports unknown function', () => {
      const r = evaluateFormula('Bogus(1)', ctx());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('FORMULA_RUNTIME_ERROR');
    });
  });
});
