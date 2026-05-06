import { DomainError } from '@biz-checks/domain';

import type { TemplateDocument } from './schemas.js';
import type { AuditWriter } from '../../shared/middleware/audit.js';
import type { CheckTemplate, PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';



export interface TemplateRecord {
  id: string;
  organizationId: string;
  bankAccountId: string | null;
  name: string;
  description: string | null;
  version: number;
  isPublished: boolean;
  archivedAt: Date | null;
  document: TemplateDocument;
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditWriter,
  ) {}

  async list(organizationId: string): Promise<{ items: TemplateRecord[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.checkTemplate.findMany({
        where: { organizationId, archivedAt: null },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.checkTemplate.count({ where: { organizationId, archivedAt: null } }),
    ]);
    return { items: items.map(toRecord), total };
  }

  async get(organizationId: string, id: string): Promise<TemplateRecord> {
    const found = await this.prisma.checkTemplate.findFirst({ where: { id, organizationId } });
    if (!found) throw new DomainError('NOT_FOUND', 'Template not found');
    return toRecord(found);
  }

  async create(
    input: { name: string; description?: string; bankAccountId?: string; document: TemplateDocument },
    ctx: { organizationId: string; userId: string; ip?: string; ua?: string },
  ): Promise<TemplateRecord> {
    const created = await this.prisma.$transaction(async (tx) => {
      const template = await tx.checkTemplate.create({
        data: {
          organizationId: ctx.organizationId,
          bankAccountId: input.bankAccountId ?? null,
          name: input.name,
          description: input.description ?? null,
          document: input.document,
          createdById: ctx.userId,
          updatedById: ctx.userId,
          versions: {
            create: {
              version: 1,
              document: input.document,
              createdById: ctx.userId,
            },
          },
        },
      });
      await this.audit.log(
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: 'CREATE',
          resourceType: 'CheckTemplate',
          resourceId: template.id,
          metadata: { name: template.name, version: template.version },
          ipAddress: ctx.ip,
          userAgent: ctx.ua,
        },
        tx,
      );
      return template;
    });
    return toRecord(created);
  }

  async update(
    id: string,
    input: { name?: string; description?: string; bankAccountId?: string | null; document?: TemplateDocument },
    ctx: { organizationId: string; userId: string; ip?: string; ua?: string },
  ): Promise<TemplateRecord> {
    const existing = await this.prisma.checkTemplate.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!existing) throw new DomainError('NOT_FOUND', 'Template not found');
    if (existing.isPublished && input.document) {
      throw new DomainError(
        'TEMPLATE_PUBLISHED_IMMUTABLE',
        'Published templates cannot be edited; create a new version first',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.CheckTemplateUpdateInput = {
        updatedById: ctx.userId,
      };
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.bankAccountId !== undefined) {
        data.bankAccount = input.bankAccountId
          ? { connect: { id: input.bankAccountId } }
          : { disconnect: true };
      }
      if (input.document) {
        data.document = input.document;
        data.version = { increment: 1 };
      }

      const template = await tx.checkTemplate.update({ where: { id }, data });
      if (input.document) {
        await tx.templateVersion.create({
          data: {
            templateId: template.id,
            version: template.version,
            document: input.document,
            createdById: ctx.userId,
          },
        });
      }
      await this.audit.log(
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: 'UPDATE',
          resourceType: 'CheckTemplate',
          resourceId: template.id,
          metadata: { version: template.version },
          ipAddress: ctx.ip,
          userAgent: ctx.ua,
        },
        tx,
      );
      return template;
    });
    return toRecord(updated);
  }

  async publish(
    id: string,
    ctx: { organizationId: string; userId: string },
  ): Promise<TemplateRecord> {
    const updated = await this.prisma.checkTemplate.updateMany({
      where: { id, organizationId: ctx.organizationId, archivedAt: null },
      data: { isPublished: true, updatedById: ctx.userId },
    });
    if (updated.count === 0) throw new DomainError('NOT_FOUND', 'Template not found');
    return this.get(ctx.organizationId, id);
  }

  async archive(id: string, ctx: { organizationId: string; userId: string }): Promise<void> {
    const updated = await this.prisma.checkTemplate.updateMany({
      where: { id, organizationId: ctx.organizationId, archivedAt: null },
      data: { archivedAt: new Date(), updatedById: ctx.userId },
    });
    if (updated.count === 0) throw new DomainError('NOT_FOUND', 'Template not found');
  }
}

function toRecord(t: CheckTemplate): TemplateRecord {
  return {
    id: t.id,
    organizationId: t.organizationId,
    bankAccountId: t.bankAccountId,
    name: t.name,
    description: t.description,
    version: t.version,
    isPublished: t.isPublished,
    archivedAt: t.archivedAt,
    document: t.document as unknown as TemplateDocument,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
