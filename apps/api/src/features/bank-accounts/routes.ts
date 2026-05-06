import { z } from 'zod';

import {
  BankAccountListSchema,
  BankAccountResponseSchema,
  CreateBankAccountSchema,
} from './schemas.js';
import { BankAccountService } from './service.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const bankAccountRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new BankAccountService(app.prisma, app.encryptor, app.audit);

  app.addHook('preHandler', app.requireAuth);
  app.addHook('preHandler', app.requireTenant);

  app.get('/', {
    schema: { response: { 200: BankAccountListSchema } },
    handler: async (req) => {
      const { items, total } = await service.list(req.organizationId!);
      return {
        items: items.map(serialize),
        total,
      };
    },
  });

  app.get('/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      response: { 200: BankAccountResponseSchema },
    },
    handler: async (req) => {
      const account = await service.get(req.organizationId!, req.params.id);
      return serialize(account);
    },
  });

  app.post('/', {
    preHandler: app.requireRole('OWNER', 'ADMIN'),
    schema: {
      body: CreateBankAccountSchema,
      response: { 201: BankAccountResponseSchema },
    },
    handler: async (req, reply) => {
      const created = await service.create(req.body, {
        organizationId: req.organizationId!,
        userId: req.auth!.userId,
        ip: req.ip,
        ua: req.headers['user-agent'] ?? undefined,
      });
      return reply.code(201).send(serialize(created));
    },
  });
};

function serialize(a: Awaited<ReturnType<BankAccountService['get']>>): {
  id: string;
  nickname: string;
  bankName: string;
  bankAddress: string | null;
  routingNumber: string;
  accountNumberLast4: string;
  payerName: string;
  payerAddress: string | null;
  payerPhone: string | null;
  nextCheckNumber: number;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
} {
  return { ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() };
}
