import { FormulaError, type Token } from './tokens.js';

const SINGLE_CHAR_TOKENS: Record<string, Token['kind']> = {
  '(': 'lparen',
  ')': 'rparen',
  ',': 'comma',
  '+': 'plus',
  '-': 'minus',
  '*': 'star',
  '/': 'slash',
  '&': 'amp',
};

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const c = input[i];
    if (c === undefined) break;

    // Whitespace
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i += 1;
      continue;
    }

    // Single-char operators
    const single = SINGLE_CHAR_TOKENS[c];
    if (single) {
      tokens.push({ kind: single, value: c, start: i, end: i + 1 });
      i += 1;
      continue;
    }

    // String literals — double-quoted, support "" as escaped quote
    if (c === '"') {
      const start = i;
      i += 1;
      let str = '';
      while (i < input.length) {
        const ch = input[i];
        if (ch === '"') {
          // Look ahead for "" escape
          if (input[i + 1] === '"') {
            str += '"';
            i += 2;
            continue;
          }
          break;
        }
        str += ch;
        i += 1;
      }
      if (i >= input.length) {
        throw new FormulaError('PARSE', 'Unterminated string literal', start);
      }
      i += 1; // closing "
      tokens.push({ kind: 'string', value: str, start, end: i });
      continue;
    }

    // Numbers (support integers and floats)
    if (c >= '0' && c <= '9') {
      const start = i;
      while (i < input.length) {
        const ch = input[i];
        if (ch === undefined) break;
        if ((ch >= '0' && ch <= '9') || ch === '.') i += 1;
        else break;
      }
      tokens.push({ kind: 'number', value: input.slice(start, i), start, end: i });
      continue;
    }

    // Identifiers and special variables (L#, T#)
    if (isIdentStart(c)) {
      const start = i;
      while (i < input.length) {
        const ch = input[i];
        if (ch === undefined) break;
        if (isIdentPart(ch)) i += 1;
        else break;
      }
      // Allow trailing # for L#, T#
      if (input[i] === '#') i += 1;
      tokens.push({ kind: 'identifier', value: input.slice(start, i), start, end: i });
      continue;
    }

    throw new FormulaError('PARSE', `Unexpected character "${c}"`, i);
  }

  tokens.push({ kind: 'eof', value: '', start: i, end: i });
  return tokens;
}

function isIdentStart(c: string): boolean {
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_';
}

function isIdentPart(c: string): boolean {
  return isIdentStart(c) || (c >= '0' && c <= '9');
}
