import { z } from 'zod';

import {
  CreateTemplateSchema,
  TemplateListSchema,
  TemplateResponseSchema,
  UpdateTemplateSchema,
} from './schemas.js';
import { TemplateService, type TemplateRecord } from './service.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const templateRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new TemplateService(app.prisma, app.audit);
  app.addHook('preHandler', app.requireAuth);
  app.addHook('preHandler', app.requireTenant);

  app.get('/', {
    schema: { response: { 200: TemplateListSchema } },
    handler: async (req) => {
      const { items, total } = await service.list(req.organizationId!);
      return { items: items.map(serialize), total };
    },
  });

  app.get('/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      response: { 200: TemplateResponseSchema },
    },
    handler: async (req) => {
      const t = await service.get(req.organizationId!, req.params.id);
      return serialize(t);
    },
  });

  app.post('/', {
    preHandler: app.requireRole('OWNER', 'ADMIN', 'DESIGNER'),
    schema: { body: CreateTemplateSchema, response: { 201: TemplateResponseSchema } },
    handler: async (req, reply) => {
      const t = await service.create(req.body, {
        organizationId: req.organizationId!,
        userId: req.auth!.userId,
        ip: req.ip,
        ua: req.headers['user-agent'] ?? undefined,
      });
      return reply.code(201).send(serialize(t));
    },
  });

  app.patch('/:id', {
    preHandler: app.requireRole('OWNER', 'ADMIN', 'DESIGNER'),
    schema: {
      params: z.object({ id: z.string() }),
      body: UpdateTemplateSchema,
      response: { 200: TemplateResponseSchema },
    },
    handler: async (req) => {
      const t = await service.update(req.params.id, req.body, {
        organizationId: req.organizationId!,
        userId: req.auth!.userId,
        ip: req.ip,
        ua: req.headers['user-agent'] ?? undefined,
      });
      return serialize(t);
    },
  });

  app.post('/:id/publish', {
    preHandler: app.requireRole('OWNER', 'ADMIN'),
    schema: {
      params: z.object({ id: z.string() }),
      response: { 200: TemplateResponseSchema },
    },
    handler: async (req) => {
      const t = await service.publish(req.params.id, {
        organizationId: req.organizationId!,
        userId: req.auth!.userId,
      });
      return serialize(t);
    },
  });

  app.delete('/:id', {
    preHandler: app.requireRole('OWNER', 'ADMIN'),
    schema: {
      params: z.object({ id: z.string() }),
      response: { 204: z.null() },
    },
    handler: async (req, reply) => {
      await service.archive(req.params.id, {
        organizationId: req.organizationId!,
        userId: req.auth!.userId,
      });
      return reply.code(204).send(null);
    },
  });
};

function serialize(t: TemplateRecord): {
  id: string;
  organizationId: string;
  bankAccountId: string | null;
  name: string;
  description: string | null;
  version: number;
  isPublished: boolean;
  archivedAt: string | null;
  document: TemplateRecord['document'];
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: t.id,
    organizationId: t.organizationId,
    bankAccountId: t.bankAccountId,
    name: t.name,
    description: t.description,
    version: t.version,
    isPublished: t.isPublished,
    archivedAt: t.archivedAt ? t.archivedAt.toISOString() : null,
    document: t.document,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
