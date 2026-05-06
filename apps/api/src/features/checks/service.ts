import { DomainError } from '@biz-checks/domain';

import type { AuditWriter } from '../../shared/middleware/audit.js';
import type { Check, CheckStatus, PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';


export interface CheckRecord {
  id: string;
  organizationId: string;
  bankAccountId: string;
  templateId: string;
  batchId: string | null;
  serialNumber: number;
  payeeName: string;
  amountMinor: bigint;
  currency: string;
  memo: string | null;
  issueDate: Date;
  status: CheckStatus;
  pdfChecksum: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CheckService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditWriter,
  ) {}

  async create(
    input: {
      bankAccountId: string;
      templateId: string;
      payeeName: string;
      amountMinor: number;
      currency: string;
      memo?: string;
      issueDate: Date;
    },
    ctx: { organizationId: string; userId: string; ip?: string; ua?: string },
  ): Promise<CheckRecord> {
    const created = await this.prisma.$transaction(async (tx) => {
      // Validate bank account belongs to org and is active
      const account = await tx.bankAccount.findFirst({
        where: { id: input.bankAccountId, organizationId: ctx.organizationId },
      });
      if (!account) throw new DomainError('NOT_FOUND', 'Bank account not found');
      if (account.status !== 'ACTIVE') {
        throw new DomainError('BANK_ACCOUNT_INACTIVE', 'Bank account is not active');
      }
      const template = await tx.checkTemplate.findFirst({
        where: { id: input.templateId, organizationId: ctx.organizationId },
      });
      if (!template) throw new DomainError('NOT_FOUND', 'Template not found');

      const serial = account.nextCheckNumber;
      await tx.bankAccount.update({
        where: { id: account.id },
        data: { nextCheckNumber: serial + 1 },
      });

      const check = await tx.check.create({
        data: {
          organizationId: ctx.organizationId,
          bankAccountId: input.bankAccountId,
          templateId: input.templateId,
          serialNumber: serial,
          payeeName: input.payeeName,
          amountMinor: BigInt(input.amountMinor),
          currency: input.currency,
          memo: input.memo ?? null,
          issueDate: input.issueDate,
          fieldSnapshot: {},
          status: 'DRAFT',
          createdById: ctx.userId,
        },
      });

      await this.audit.log(
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: 'CREATE',
          resourceType: 'Check',
          resourceId: check.id,
          metadata: { serialNumber: serial, amountMinor: input.amountMinor, currency: input.currency },
          ipAddress: ctx.ip,
          userAgent: ctx.ua,
        },
        tx,
      );

      return check;
    });

    return toRecord(created);
  }

  async list(
    organizationId: string,
    filter: { bankAccountId?: string; status?: CheckStatus; cursor?: string; limit: number },
  ): Promise<{ items: CheckRecord[]; total: number }> {
    const where: Prisma.CheckWhereInput = { organizationId };
    if (filter.bankAccountId) where.bankAccountId = filter.bankAccountId;
    if (filter.status) where.status = filter.status;

    const [items, total] = await Promise.all([
      this.prisma.check.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit,
        ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      }),
      this.prisma.check.count({ where }),
    ]);
    return { items: items.map(toRecord), total };
  }

  async get(organizationId: string, id: string): Promise<CheckRecord> {
    const found = await this.prisma.check.findFirst({ where: { id, organizationId } });
    if (!found) throw new DomainError('NOT_FOUND', 'Check not found');
    return toRecord(found);
  }

  async voidCheck(
    id: string,
    reason: string,
    ctx: { organizationId: string; userId: string; ip?: string; ua?: string },
  ): Promise<CheckRecord> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const check = await tx.check.findFirst({ where: { id, organizationId: ctx.organizationId } });
      if (!check) throw new DomainError('NOT_FOUND', 'Check not found');
      if (check.status === 'VOIDED') {
        throw new DomainError('CHECK_ALREADY_VOIDED', 'Check is already voided');
      }
      const result = await tx.check.update({
        where: { id },
        data: {
          status: 'VOIDED',
          voidedAt: new Date(),
          voidedById: ctx.userId,
          voidReason: reason,
        },
      });
      await this.audit.log(
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: 'VOID',
          resourceType: 'Check',
          resourceId: id,
          metadata: { reason, serialNumber: check.serialNumber },
          ipAddress: ctx.ip,
          userAgent: ctx.ua,
        },
        tx,
      );
      return result;
    });
    return toRecord(updated);
  }

  /** Marks a check as PRINTED. Idempotent — safe to retry. */
  async markPrinted(
    id: string,
    pdfChecksum: string,
    ctx: { organizationId: string; userId: string },
  ): Promise<CheckRecord> {
    const updated = await this.prisma.check.update({
      where: { id },
      data: {
        status: 'PRINTED',
        pdfChecksum,
      },
    });
    await this.audit.log({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'PRINT',
      resourceType: 'Check',
      resourceId: id,
      metadata: { pdfChecksum },
    });
    return toRecord(updated);
  }
}

function toRecord(c: Check): CheckRecord {
  return {
    id: c.id,
    organizationId: c.organizationId,
    bankAccountId: c.bankAccountId,
    templateId: c.templateId,
    batchId: c.batchId,
    serialNumber: c.serialNumber,
    payeeName: c.payeeName,
    amountMinor: c.amountMinor,
    currency: c.currency,
    memo: c.memo,
    issueDate: c.issueDate,
    status: c.status,
    pdfChecksum: c.pdfChecksum,
    voidedAt: c.voidedAt,
    voidReason: c.voidReason,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
