import { DomainError } from '@biz-checks/domain';
import { z } from 'zod';


import { BankAccountService } from '../bank-accounts/service.js';

import {
  CheckBatchListQuerySchema,
  CheckBatchListSchema,
  CheckBatchResponseSchema,
  CreateCheckBatchSchema,
} from './schemas.js';
import { CheckBatchService, type CheckBatchRecord } from './service.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const checkBatchRoutes: FastifyPluginAsyncZod = async (app) => {
  const accounts = new BankAccountService(app.prisma, app.encryptor, app.audit);
  const service = new CheckBatchService(app.prisma, accounts, app.storage, app.audit);

  app.addHook('preHandler', app.requireAuth);
  app.addHook('preHandler', app.requireTenant);

  app.get('/', {
    schema: {
      querystring: CheckBatchListQuerySchema,
      response: { 200: CheckBatchListSchema },
    },
    handler: async (req) => {
      const { items, total } = await service.list(req.organizationId!, req.query);
      return { items: items.map(serialize), total };
    },
  });

  app.get('/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      response: { 200: CheckBatchResponseSchema },
    },
    handler: async (req) => serialize(await service.get(req.organizationId!, req.params.id)),
  });

  app.post('/', {
    preHandler: app.requireRole('OWNER', 'ADMIN', 'DESIGNER', 'PRINTER'),
    schema: {
      body: CreateCheckBatchSchema,
      response: { 201: CheckBatchResponseSchema },
    },
    handler: async (req, reply) => {
      const idempotencyKey = req.headers['idempotency-key'];
      if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) {
        throw new DomainError(
          'IDEMPOTENCY_KEY_REQUIRED',
          'Idempotency-Key header is required for batch creation (min length 8)',
        );
      }
      const { batch } = await service.create(req.body, {
        organizationId: req.organizationId!,
        userId: req.auth!.userId,
        idempotencyKey,
        ip: req.ip,
        ua: req.headers['user-agent'] ?? undefined,
      });
      return reply.code(201).send(serialize(batch));
    },
  });

  app.post('/:id/print', {
    preHandler: app.requireRole('OWNER', 'ADMIN', 'PRINTER'),
    schema: {
      params: z.object({ id: z.string() }),
      response: { 200: CheckBatchResponseSchema },
    },
    handler: async (req) =>
      serialize(
        await service.markPrinted(req.params.id, {
          organizationId: req.organizationId!,
          userId: req.auth!.userId,
          ip: req.ip,
          ua: req.headers['user-agent'] ?? undefined,
        }),
      ),
  });

  app.get('/:id/pdf', {
    preHandler: app.requireRole('OWNER', 'ADMIN', 'DESIGNER', 'PRINTER', 'VIEWER'),
    schema: {
      params: z.object({ id: z.string() }),
    },
    handler: async (req, reply) => {
      const { bytes, checksum } = await service.getRenderedPDF(
        req.organizationId!,
        req.params.id,
      );
      return reply
        .header('content-type', 'application/pdf')
        .header('content-disposition', `inline; filename="batch-${req.params.id}.pdf"`)
        .header('x-pdf-checksum', checksum)
        .header('cache-control', 'private, max-age=300')
        .send(bytes);
    },
  });
};

function serialize(b: CheckBatchRecord): {
  id: string;
  organizationId: string;
  bankAccountId: string;
  templateId: string;
  name: string;
  count: number;
  status: CheckBatchRecord['status'];
  totalAmountMinor: string;
  currency: string;
  pdfStorageKey: string | null;
  pdfChecksum: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: b.id,
    organizationId: b.organizationId,
    bankAccountId: b.bankAccountId,
    templateId: b.templateId,
    name: b.name,
    count: b.count,
    status: b.status,
    totalAmountMinor: b.totalAmountMinor.toString(),
    currency: b.currency,
    pdfStorageKey: b.pdfStorageKey,
    pdfChecksum: b.pdfChecksum,
    startedAt: b.startedAt ? b.startedAt.toISOString() : null,
    completedAt: b.completedAt ? b.completedAt.toISOString() : null,
    errorMessage: b.errorMessage,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
