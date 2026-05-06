export type Expr =
  | NumberLit
  | StringLit
  | Identifier
  | Variable
  | Binary
  | Unary
  | Call;

export interface NumberLit {
  readonly type: 'number';
  readonly value: number;
}

export interface StringLit {
  readonly type: 'string';
  readonly value: string;
}

/** Bare identifier — a function name awaiting Call wrapping, or a builtin like VBCRLF. */
export interface Identifier {
  readonly type: 'identifier';
  readonly name: string;
}

/** L# (label number), T# (total labels). */
export interface Variable {
  readonly type: 'variable';
  readonly name: 'L#' | 'T#';
}

export interface Binary {
  readonly type: 'binary';
  readonly op: '+' | '-' | '*' | '/' | '&';
  readonly left: Expr;
  readonly right: Expr;
}

export interface Unary {
  readonly type: 'unary';
  readonly op: '-' | '+';
  readonly operand: Expr;
}

export interface Call {
  readonly type: 'call';
  readonly callee: string;
  readonly args: readonly Expr[];
}
