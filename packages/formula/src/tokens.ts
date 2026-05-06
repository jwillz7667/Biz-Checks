export type TokenKind =
  | 'number'
  | 'string'
  | 'identifier'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'plus'
  | 'minus'
  | 'star'
  | 'slash'
  | 'amp'
  | 'eof';

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

export class FormulaError extends Error {
  public readonly code: 'PARSE' | 'RUNTIME';
  public readonly position?: number;

  constructor(code: 'PARSE' | 'RUNTIME', message: string, position?: number) {
    super(message);
    this.name = 'FormulaError';
    this.code = code;
    this.position = position;
  }
}
