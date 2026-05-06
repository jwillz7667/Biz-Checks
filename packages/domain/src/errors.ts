/**
 * Domain-level error hierarchy. Each error has a stable code for
 * programmatic dispatch and a human message for logs. Never include
 * sensitive values in messages — codes are safe to surface to clients.
 */
export type DomainErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'INVARIANT_VIOLATED'
  | 'MICR_INVALID'
  | 'ROUTING_CHECKSUM_FAILED'
  | 'FORMULA_PARSE_ERROR'
  | 'FORMULA_RUNTIME_ERROR'
  | 'CHECK_ALREADY_PRINTED'
  | 'CHECK_ALREADY_VOIDED'
  | 'BANK_ACCOUNT_INACTIVE'
  | 'TEMPLATE_PUBLISHED_IMMUTABLE'
  | 'IDEMPOTENCY_KEY_CONFLICT'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'BATCH_NOT_RENDERED'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly details?: Readonly<Record<string, unknown>>;
  public override readonly cause?: unknown;

  constructor(
    code: DomainErrorCode,
    message: string,
    options: { details?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = options.details ? Object.freeze({ ...options.details }) : undefined;
    this.cause = options.cause;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_FAILED', message, { details });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} not found`, { details: { resource, id } });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, { details });
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(action: string) {
    super('FORBIDDEN', `Not authorized to ${action}`, { details: { action } });
    this.name = 'ForbiddenError';
  }
}

export class InvariantViolation extends DomainError {
  constructor(message: string) {
    super('INVARIANT_VIOLATED', message);
    this.name = 'InvariantViolation';
  }
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}
