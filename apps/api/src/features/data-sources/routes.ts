import { z } from 'zod';

import {
  CreateDataSourceSchema,
  DataSourceListSchema,
  DataSourceResponseSchema,
  UpdateDataSourceSchema,
} from './schemas.js';
import { DataSourceService, parseCSV, type DataSourceRecord } from './service.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const dataSourceRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new DataSourceService(app.prisma, app.audit);
  app.addHook('preHandler', app.requireAuth);
  app.addHook('preHandler', app.requireTenant);

  app.get('/', {
    schema: { response: { 200: DataSourceListSchema } },
    handler: async (req) => {
      const { items, total } = await service.list(req.organizationId!);
      return {
        items: items.map((d) => ({
          id: d.id,
          name: d.name,
          kind: d.kind,
          columns: d.columns as DataSourceRecord['columns'],
          sourceFilename: d.sourceFilename,
          rowHash: d.rowHash,
          rowCount: Array.isArray(d.rows) ? d.rows.length : 0,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        })),
        total,
      };
    },
  });

  app.get('/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      response: { 200: DataSourceResponseSchema },
    },
    handler: async (req) => {
      const d = await service.get(req.organizationId!, req.params.id);
      return {
        id: d.id,
        name: d.name,
        kind: d.kind,
        columns: d.columns,
        rows: d.rows,
        sourceFilename: d.sourceFilename,
        rowHash: d.rowHash,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    },
  });

  app.post('/', {
    preHandler: app.requireRole('OWNER', 'ADMIN', 'DESIGNER'),
    schema: { body: CreateDataSourceSchema, response: { 201: DataSourceResponseSchema } },
    handler: async (req, reply) => {
      const d = await service.create(req.body, {
        organizationId: req.organizationId!,
        userId: req.auth!.userId,
        ip: req.ip,
        ua: req.headers['user-agent'] ?? undefined,
      });
      return reply.code(201).send({
        id: d.id,
        name: d.name,
        kind: d.kind,
        columns: d.columns,
        rows: d.rows,
        sourceFilename: d.sourceFilename,
        rowHash: d.rowHash,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      });
    },
  });

  app.post('/import-csv', {
    preHandler: app.requireRole('OWNER', 'ADMIN', 'DESIGNER'),
    schema: {
      body: z.object({
        name: z.string().min(1).max(200),
        sourceFilename: z.string().max(255).optional(),
        text: z.string().min(1).max(10 * 1024 * 1024),
      }),
      response: { 201: DataSourceResponseSchema },
    },
    handler: async (req, reply) => {
      const parsed = parseCSV(req.body.text);
      const d = await service.create(
        {
          name: req.body.name,
          kind: 'CSV',
          columns: parsed.columns,
          rows: parsed.rows,
          sourceFilename: req.body.sourceFilename,
        },
        {
          organizationId: req.organizationId!,
          userId: req.auth!.userId,
          ip: req.ip,
          ua: req.headers['user-agent'] ?? undefined,
        },
      );
      return reply.code(201).send({
        id: d.id,
        name: d.name,
        kind: d.kind,
        columns: d.columns,
        rows: d.rows,
        sourceFilename: d.sourceFilename,
        rowHash: d.rowHash,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      });
    },
  });

  app.patch('/:id', {
    preHandler: app.requireRole('OWNER', 'ADMIN', 'DESIGNER'),
    schema: {
      params: z.object({ id: z.string() }),
      body: UpdateDataSourceSchema,
      response: { 200: DataSourceResponseSchema },
    },
    handler: async (req) => {
      const d = await service.update(req.params.id, req.body, {
        organizationId: req.organizationId!,
        userId: req.auth!.userId,
      });
      return {
        id: d.id,
        name: d.name,
        kind: d.kind,
        columns: d.columns,
        rows: d.rows,
        sourceFilename: d.sourceFilename,
        rowHash: d.rowHash,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    },
  });

  app.delete('/:id', {
    preHandler: app.requireRole('OWNER', 'ADMIN'),
    schema: {
      params: z.object({ id: z.string() }),
      response: { 204: z.null() },
    },
    handler: async (req, reply) => {
      await service.delete(req.params.id, { organizationId: req.organizationId! });
      return reply.code(204).send(null);
    },
  });
};
