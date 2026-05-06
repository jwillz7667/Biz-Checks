import fp from 'fastify-plugin';

import type { AuditAction, Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export interface AuditWriter {
  log: (entry: AuditEntry, tx?: Prisma.TransactionClient) => Promise<void>;
}

export interface AuditEntry {
  organizationId: string;
  userId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

declare module 'fastify' {
  interface FastifyInstance {
    audit: AuditWriter;
  }

  interface FastifyRequest {
    auditContext: () => Pick<AuditEntry, 'ipAddress' | 'userAgent'>;
  }
}

export const auditPlugin = fp(async (app: FastifyInstance) => {
  const writer: AuditWriter = {
    async log(entry, tx) {
      const client = tx ?? app.prisma;
      await client.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          userId: entry.userId ?? null,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    },
  };

  app.decorate('audit', writer);
  app.decorateRequest('auditContext', function auditContext(this: FastifyRequest) {
    return {
      ipAddress: this.ip,
      userAgent: this.headers['user-agent'] ?? null,
    };
  });
});
