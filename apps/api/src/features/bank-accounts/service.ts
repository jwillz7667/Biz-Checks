import { DomainError } from '@biz-checks/domain';
import { validateRoutingNumber } from '@biz-checks/micr';

import type { CreateBankAccountInput } from './schemas.js';
import type { Encryptor } from '../../infrastructure/encryption.js';
import type { AuditWriter } from '../../shared/middleware/audit.js';
import type { BankAccount, BankAccountStatus, PrismaClient } from '@prisma/client';


export interface BankAccountSummary {
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
  status: BankAccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class BankAccountService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryptor: Encryptor,
    private readonly audit: AuditWriter,
  ) {}

  async create(
    input: CreateBankAccountInput,
    ctx: { organizationId: string; userId: string; ip?: string; ua?: string },
  ): Promise<BankAccountSummary> {
    const routing = validateRoutingNumber(input.routingNumber);
    if (!routing.ok) throw routing.error;

    const account = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bankAccount.create({
        data: {
          organizationId: ctx.organizationId,
          nickname: input.nickname,
          bankName: input.bankName,
          bankAddress: input.bankAddress ?? null,
          routingNumber: routing.value,
          accountNumberCipher: this.encryptor.encrypt(input.accountNumber),
          accountNumberLast4: input.accountNumber.slice(-4),
          auxOnUsCipher: input.auxOnUs ? this.encryptor.encrypt(input.auxOnUs) : null,
          encryptionKeyVersion: this.encryptor.keyVersion,
          payerName: input.payerName,
          payerAddress: input.payerAddress ?? null,
          payerPhone: input.payerPhone ?? null,
          nextCheckNumber: input.nextCheckNumber,
          status: 'ACTIVE',
        },
      });

      await this.audit.log(
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: 'CREATE',
          resourceType: 'BankAccount',
          resourceId: created.id,
          metadata: {
            nickname: created.nickname,
            bankName: created.bankName,
            routingNumber: created.routingNumber,
            last4: created.accountNumberLast4,
          },
          ipAddress: ctx.ip,
          userAgent: ctx.ua,
        },
        tx,
      );
      return created;
    });

    return toSummary(account);
  }

  async list(organizationId: string): Promise<{ items: BankAccountSummary[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bankAccount.count({ where: { organizationId } }),
    ]);
    return { items: items.map(toSummary), total };
  }

  async get(organizationId: string, id: string): Promise<BankAccountSummary> {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new DomainError('NOT_FOUND', 'Bank account not found', { details: { id } });
    return toSummary(account);
  }

  /**
   * Atomically reserve a contiguous range of check numbers and return the
   * starting number. Uses Postgres row-level locking via SELECT … FOR UPDATE.
   */
  async reserveCheckNumbers(
    bankAccountId: string,
    organizationId: string,
    count: number,
  ): Promise<number> {
    if (count < 1) throw new RangeError('Count must be >= 1');
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.findFirst({
        where: { id: bankAccountId, organizationId },
      });
      if (!account) throw new DomainError('NOT_FOUND', 'Bank account not found');
      if (account.status !== 'ACTIVE') {
        throw new DomainError('BANK_ACCOUNT_INACTIVE', 'Bank account is not active');
      }
      const start = account.nextCheckNumber;
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: { nextCheckNumber: start + count },
      });
      return start;
    });
  }

  /** Decrypts and returns the full account for use in MICR rendering. Use sparingly. */
  async decryptForRender(
    organizationId: string,
    id: string,
  ): Promise<{
    routingNumber: string;
    accountNumber: string;
    auxOnUs: string | null;
    payerName: string;
    payerAddress: string | null;
    nextCheckNumber: number;
  }> {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new DomainError('NOT_FOUND', 'Bank account not found');
    return {
      routingNumber: account.routingNumber,
      accountNumber: this.encryptor.decrypt(account.accountNumberCipher),
      auxOnUs: account.auxOnUsCipher ? this.encryptor.decrypt(account.auxOnUsCipher) : null,
      payerName: account.payerName,
      payerAddress: account.payerAddress,
      nextCheckNumber: account.nextCheckNumber,
    };
  }
}

function toSummary(a: BankAccount): BankAccountSummary {
  return {
    id: a.id,
    nickname: a.nickname,
    bankName: a.bankName,
    bankAddress: a.bankAddress,
    routingNumber: a.routingNumber,
    accountNumberLast4: a.accountNumberLast4,
    payerName: a.payerName,
    payerAddress: a.payerAddress,
    payerPhone: a.payerPhone,
    nextCheckNumber: a.nextCheckNumber,
    status: a.status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}
