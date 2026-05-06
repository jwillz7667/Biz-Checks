import { z } from 'zod';

import {
  CheckListQuerySchema,
  CheckListSchema,
  CheckResponseSchema,
  CreateCheckSchema,
  VoidCheckSchema,
} from './schemas.js';
import { CheckService, type CheckRecord } from './service.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const checkRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new CheckService(app.prisma, app.audit);

  app.addHook('preHandler', app.requireAuth);
  app.addHook('preHandler', app.requireTenant);

  app.get('/', {
    schema: {
      querystring: CheckListQuerySchema,
      response: { 200: CheckListSchema },
    },
    handler: async (req) => {
      const { items, total } = await service.list(req.organizationId!, req.query);
      return { items: items.map(serialize), total };
    },
  });

  app.get('/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      response: { 200: CheckResponseSchema },
    },
    handler: async (req) => serialize(await service.get(req.organizationId!, req.params.id)),
  });

  app.post('/', {
    preHandler: app.requireRole('OWNER', 'ADMIN', 'DESIGNER', 'PRINTER'),
    schema: { body: CreateCheckSchema, response: { 201: CheckResponseSchema } },
    handler: async (req, reply) => {
      const check = await service.create(req.body, {
        organizationId: req.organizationId!,
        userId: req.auth!.userId,
        ip: req.ip,
        ua: req.headers['user-agent'] ?? undefined,
      });
      return reply.code(201).send(serialize(check));
    },
  });

  app.post('/:id/void', {
    preHandler: app.requireRole('OWNER', 'ADMIN'),
    schema: {
      params: z.object({ id: z.string() }),
      body: VoidCheckSchema,
      response: { 200: CheckResponseSchema },
    },
    handler: async (req) =>
      serialize(
        await service.voidCheck(req.params.id, req.body.reason, {
          organizationId: req.organizationId!,
          userId: req.auth!.userId,
          ip: req.ip,
          ua: req.headers['user-agent'] ?? undefined,
        }),
      ),
  });
};

function serialize(c: CheckRecord): {
  id: string;
  organizationId: string;
  bankAccountId: string;
  templateId: string;
  batchId: string | null;
  serialNumber: number;
  payeeName: string;
  amountMinor: string;
  currency: string;
  memo: string | null;
  issueDate: string;
  status: CheckRecord['status'];
  pdfChecksum: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: c.id,
    organizationId: c.organizationId,
    bankAccountId: c.bankAccountId,
    templateId: c.templateId,
    batchId: c.batchId,
    serialNumber: c.serialNumber,
    payeeName: c.payeeName,
    amountMinor: c.amountMinor.toString(),
    currency: c.currency,
    memo: c.memo,
    issueDate: c.issueDate.toISOString(),
    status: c.status,
    pdfChecksum: c.pdfChecksum,
    voidedAt: c.voidedAt ? c.voidedAt.toISOString() : null,
    voidReason: c.voidReason,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
