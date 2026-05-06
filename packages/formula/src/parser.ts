import { tokenize } from './lexer.js';
import { FormulaError, type Token } from './tokens.js';

import type { Expr } from './ast.js';

/**
 * Recursive-descent parser for the formula language. Grammar:
 *
 *   expression  := concat
 *   concat      := additive ( '&' additive )*
 *   additive    := multiplicative ( ('+' | '-') multiplicative )*
 *   multiplicative := unary ( ('*' | '/') unary )*
 *   unary       := ('+' | '-')? primary
 *   primary     := number | string | call | variable | identifier | '(' expression ')'
 *   call        := IDENT '(' (expression (',' expression)*)? ')'
 *
 * Precedence (low to high): & < (+ -) < (* /) < unary < primary
 */
export function parse(input: string): Expr {
  const tokens = tokenize(input);
  let pos = 0;

  const peek = (offset = 0): Token => {
    const t = tokens[pos + offset];
    if (!t) throw new FormulaError('PARSE', 'Unexpected end of formula');
    return t;
  };
  const consume = (): Token => {
    const t = tokens[pos];
    if (!t) throw new FormulaError('PARSE', 'Unexpected end of formula');
    pos += 1;
    return t;
  };
  const expect = (kind: Token['kind']): Token => {
    const t = consume();
    if (t.kind !== kind) {
      throw new FormulaError('PARSE', `Expected ${kind} but got ${t.kind} "${t.value}"`, t.start);
    }
    return t;
  };

  const expression = (): Expr => concat();

  const concat = (): Expr => {
    let left = additive();
    while (peek().kind === 'amp') {
      consume();
      const right = additive();
      left = { type: 'binary', op: '&', left, right };
    }
    return left;
  };

  const additive = (): Expr => {
    let left = multiplicative();
    while (peek().kind === 'plus' || peek().kind === 'minus') {
      const op = consume().kind === 'plus' ? '+' : '-';
      const right = multiplicative();
      left = { type: 'binary', op, left, right };
    }
    return left;
  };

  const multiplicative = (): Expr => {
    let left = unary();
    while (peek().kind === 'star' || peek().kind === 'slash') {
      const op = consume().kind === 'star' ? '*' : '/';
      const right = unary();
      left = { type: 'binary', op, left, right };
    }
    return left;
  };

  const unary = (): Expr => {
    if (peek().kind === 'plus' || peek().kind === 'minus') {
      const op = consume().kind === 'plus' ? '+' : '-';
      const operand = primary();
      return { type: 'unary', op, operand };
    }
    return primary();
  };

  const primary = (): Expr => {
    const t = peek();
    if (t.kind === 'number') {
      consume();
      const n = Number.parseFloat(t.value);
      if (!Number.isFinite(n)) throw new FormulaError('PARSE', `Invalid number "${t.value}"`, t.start);
      return { type: 'number', value: n };
    }
    if (t.kind === 'string') {
      consume();
      return { type: 'string', value: t.value };
    }
    if (t.kind === 'lparen') {
      consume();
      const e = expression();
      expect('rparen');
      return e;
    }
    if (t.kind === 'identifier') {
      consume();
      // L# and T# variables
      if (t.value === 'L#' || t.value === 'T#') {
        return { type: 'variable', name: t.value };
      }
      // Function call: IDENT '(' ... ')'
      if (peek().kind === 'lparen') {
        consume();
        const args: Expr[] = [];
        if (peek().kind !== 'rparen') {
          args.push(expression());
          while (peek().kind === 'comma') {
            consume();
            args.push(expression());
          }
        }
        expect('rparen');
        return { type: 'call', callee: t.value, args };
      }
      // Bare identifier (e.g., VBCRLF)
      return { type: 'identifier', name: t.value };
    }
    throw new FormulaError('PARSE', `Unexpected token "${t.value}"`, t.start);
  };

  const result = expression();
  if (peek().kind !== 'eof') {
    throw new FormulaError('PARSE', `Unexpected trailing token "${peek().value}"`, peek().start);
  }
  return result;
}
