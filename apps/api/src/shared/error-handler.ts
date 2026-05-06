import { DomainError } from '@biz-checks/domain';
import { ZodError } from 'zod';

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // Zod validation errors thrown by fastify-type-provider-zod
  if (error instanceof ZodError) {
    request.log.info({ issues: error.issues }, 'validation failed');
    void reply.status(400).send({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        issues: error.issues.map((i) => ({
          path: i.path.join('.'),
          code: i.code,
          message: i.message,
        })),
      },
    });
    return;
  }

  if (error instanceof DomainError) {
    const status = statusForDomainCode(error.code);
    request.log.info(
      { code: error.code, details: error.details, status },
      'domain error',
    );
    void reply.status(status).send({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode && fastifyError.statusCode < 500) {
    request.log.info({ statusCode: fastifyError.statusCode, err: error.message }, 'client error');
    void reply.status(fastifyError.statusCode).send({
      error: {
        code: fastifyError.code ?? 'BAD_REQUEST',
        message: error.message,
      },
    });
    return;
  }

  request.log.error({ err: error }, 'internal error');
  void reply.status(500).send({
    error: {
      code: 'INTERNAL',
      message: 'An internal error occurred',
    },
  });
}

function statusForDomainCode(code: DomainError['code']): number {
  switch (code) {
    case 'VALIDATION_FAILED':
    case 'MICR_INVALID':
    case 'ROUTING_CHECKSUM_FAILED':
    case 'FORMULA_PARSE_ERROR':
    case 'FORMULA_RUNTIME_ERROR':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
    case 'IDEMPOTENCY_KEY_CONFLICT':
    case 'CHECK_ALREADY_PRINTED':
    case 'CHECK_ALREADY_VOIDED':
    case 'TEMPLATE_PUBLISHED_IMMUTABLE':
    case 'BATCH_NOT_RENDERED':
      return 409;
    case 'IDEMPOTENCY_KEY_REQUIRED':
      return 400;
    case 'BANK_ACCOUNT_INACTIVE':
      return 422;
    case 'RATE_LIMITED':
      return 429;
    case 'INVARIANT_VIOLATED':
    case 'INTERNAL':
      return 500;
  }
}
