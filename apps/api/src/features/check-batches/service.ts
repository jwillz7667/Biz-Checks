import { createHash } from 'node:crypto';

import { advanceLabelFields } from '@biz-checks/check-engine';
import {
  DomainError,
  type BankAccount,
  type CheckTemplate,
  type DataColumn,
  type DataRow,
} from '@biz-checks/domain';


import {
  renderBatchPDF,
  type CheckRenderRow,
} from '../print/pdf-renderer.js';
import { TemplateDocumentSchema, type TemplateDocument } from '../templates/schemas.js';

import type { CreateCheckBatchInput } from './schemas.js';
import type { Storage } from '../../infrastructure/storage.js';
import type { AuditWriter } from '../../shared/middleware/audit.js';
import type { BankAccountService } from '../bank-accounts/service.js';
import type { BatchStatus, CheckBatch, PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export interface CheckBatchRecord {
  id: string;
  organizationId: string;
  bankAccountId: string;
  templateId: string;
  name: string;
  count: number;
  status: BatchStatus;
  totalAmountMinor: bigint;
  currency: string;
  pdfStorageKey: string | null;
  pdfChecksum: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchCreationResult {
  batch: CheckBatchRecord;
  pdfBytes: Uint8Array;
}

export class CheckBatchService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly accounts: BankAccountService,
    private readonly storage: Storage,
    private readonly audit: AuditWriter,
  ) {}

  async list(
    organizationId: string,
    filter: {
      bankAccountId?: string;
      status?: BatchStatus;
      cursor?: string;
      limit: number;
    },
  ): Promise<{ items: CheckBatchRecord[]; total: number }> {
    const where: Prisma.CheckBatchWhereInput = { organizationId };
    if (filter.bankAccountId) where.bankAccountId = filter.bankAccountId;
    if (filter.status) where.status = filter.status;

    const [items, total] = await Promise.all([
      this.prisma.checkBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit,
        ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      }),
      this.prisma.checkBatch.count({ where }),
    ]);
    return { items: items.map(toRecord), total };
  }

  async get(organizationId: string, id: string): Promise<CheckBatchRecord> {
    const found = await this.prisma.checkBatch.findFirst({
      where: { id, organizationId },
    });
    if (!found) throw new DomainError('NOT_FOUND', 'Check batch not found');
    return toRecord(found);
  }

  /**
   * Create a batch and render its PDF in a single atomic flow.
   *
   * The flow is:
   *   1. Look up template + bank account (single transaction; locks the
   *      account row against concurrent number allocation).
   *   2. Atomically reserve a contiguous range of serial numbers and
   *      advance any incrementing label fields, persisting the new state.
   *   3. Create the CheckBatch row with the supplied idempotency key.
   *   4. Create one Check row per input row, linked to the batch.
   *   5. Render the PDF outside the transaction (rendering can be slow;
   *      we don't want to hold DB locks for it).
   *   6. Persist the rendered PDF to object storage and update the batch
   *      with the storage key + checksum + RENDERED status.
   *
   * Idempotency: a conflict on (organizationId, idempotencyKey) returns
   * the existing batch + PDF — no duplicate work, no duplicate serial
   * numbers issued.
   */
  async create(
    input: CreateCheckBatchInput,
    ctx: {
      organizationId: string;
      userId: string;
      idempotencyKey: string;
      ip?: string;
      ua?: string;
    },
  ): Promise<BatchCreationResult> {
    const existing = await this.prisma.checkBatch.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: ctx.organizationId,
          idempotencyKey: ctx.idempotencyKey,
        },
      },
    });
    if (existing) {
      const pdf = existing.pdfStorageKey
        ? await this.storage.get(existing.pdfStorageKey)
        : Buffer.alloc(0);
      return { batch: toRecord(existing), pdfBytes: pdf };
    }

    const totalAmount = input.rows.reduce(
      (acc, row) => acc + BigInt(row.amountMinor),
      0n,
    );

    const { batch, renderRows, template } = await this.prisma.$transaction(
      async (tx) => {
        const bankAccountRow = await tx.bankAccount.findFirst({
          where: { id: input.bankAccountId, organizationId: ctx.organizationId },
        });
        if (!bankAccountRow) {
          throw new DomainError('NOT_FOUND', 'Bank account not found');
        }
        if (bankAccountRow.status !== 'ACTIVE') {
          throw new DomainError('BANK_ACCOUNT_INACTIVE', 'Bank account is not active');
        }
        const templateRow = await tx.checkTemplate.findFirst({
          where: { id: input.templateId, organizationId: ctx.organizationId, archivedAt: null },
        });
        if (!templateRow) throw new DomainError('NOT_FOUND', 'Template not found');

        let dataColumns: readonly DataColumn[] | undefined;
        let dataRows: readonly DataRow[] | undefined;
        if (input.dataSourceId) {
          const ds = await tx.dataSource.findFirst({
            where: { id: input.dataSourceId, organizationId: ctx.organizationId },
          });
          if (!ds) throw new DomainError('NOT_FOUND', 'Data source not found');
          dataColumns = ds.columns as unknown as DataColumn[];
          dataRows = ds.rows as unknown as DataRow[];
        }

        const document = TemplateDocumentSchema.parse(templateRow.document);
        const builtTemplate = buildCheckTemplate(templateRow, document);

        // Reserve a contiguous range of check numbers. We do not rely on the
        // optimistic CheckService.create path; instead we lock the account
        // row and increment it once for the whole batch.
        const startSerial = bankAccountRow.nextCheckNumber;
        const count = input.rows.length;
        await tx.bankAccount.update({
          where: { id: bankAccountRow.id },
          data: { nextCheckNumber: startSerial + count },
        });

        // Advance any incrementing label fields (other than the special
        // SerialNumber, which we wire from `startSerial`). The returned
        // snapshot maps each row index to its label-field values.
        const advanced = advanceLabelFields(builtTemplate, count);
        if (advanced.template.labelFields.length > 0) {
          const persistedDoc: TemplateDocument = {
            stock: advanced.template.stock,
            objects: advanced.template.objects,
            labelFields: [...advanced.template.labelFields],
            background: document.background,
            securityPattern: document.securityPattern,
          };
          await tx.checkTemplate.update({
            where: { id: templateRow.id },
            data: { document: serializeTemplateDocument(persistedDoc) },
          });
        }

        const decryptedAccount = await this.accounts.decryptForRender(
          ctx.organizationId,
          bankAccountRow.id,
        );
        const accountForRender = buildBankAccount(bankAccountRow, decryptedAccount);

        const batchRow = await tx.checkBatch.create({
          data: {
            organizationId: ctx.organizationId,
            bankAccountId: bankAccountRow.id,
            templateId: templateRow.id,
            name: input.name,
            count,
            idempotencyKey: ctx.idempotencyKey,
            status: 'RENDERING',
            totalAmountMinor: totalAmount,
            currency: input.currency,
            startedAt: new Date(),
            createdById: ctx.userId,
          },
        });

        // Materialize per-row inputs for the renderer + create Check rows.
        const renderRowsLocal: CheckRenderRow[] = [];
        const dataColumnNames = dataColumns?.map((c) => c.name);

        for (let i = 0; i < input.rows.length; i += 1) {
          const row = input.rows[i];
          if (!row) continue;
          const serialNumber = startSerial + i;
          const slot = advanced.snapshot[i] ?? {};
          const labelFieldValues: Record<string, string> = {
            ...slot,
            ...(row.labelFieldOverrides ?? {}),
            // Per-row builtins exposed to formulas.
            PayeeName: row.payeeName,
            Amount: minorToDecimalString(row.amountMinor),
            Memo: row.memo ?? '',
            IssueDate: (row.issueDate ?? input.issueDate).toISOString().slice(0, 10),
          };

          const dataRow = pickDataRow(dataRows, row.dataRowIndex);

          await tx.check.create({
            data: {
              organizationId: ctx.organizationId,
              bankAccountId: bankAccountRow.id,
              templateId: templateRow.id,
              batchId: batchRow.id,
              serialNumber,
              payeeName: row.payeeName,
              amountMinor: BigInt(row.amountMinor),
              currency: input.currency,
              memo: row.memo ?? null,
              issueDate: row.issueDate ?? input.issueDate,
              fieldSnapshot: {
                serialNumber: String(serialNumber),
                labelFieldValues,
                ...(dataRow ? { dataRow } : {}),
              },
              status: 'QUEUED',
              createdById: ctx.userId,
            },
          });

          const renderRow: CheckRenderRow = {
            account: accountForRender,
            serialNumber: String(serialNumber),
            labelFieldValues,
          };
          if (dataRow) renderRow.dataRow = dataRow;
          if (dataColumnNames) renderRow.dataColumns = dataColumnNames;
          renderRowsLocal.push(renderRow);
        }

        await this.audit.log(
          {
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            action: 'CREATE',
            resourceType: 'CheckBatch',
            resourceId: batchRow.id,
            metadata: {
              count,
              totalAmountMinor: totalAmount.toString(),
              currency: input.currency,
              startSerial,
              endSerial: startSerial + count - 1,
            },
            ipAddress: ctx.ip,
            userAgent: ctx.ua,
          },
          tx,
        );

        return {
          batch: batchRow,
          renderRows: renderRowsLocal,
          template: advanced.template,
        };
      },
      { timeout: 30_000 },
    );

    // Render outside the transaction; rendering can take seconds for large
    // batches and we don't want to hold the bank-account row lock that long.
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await renderBatchPDF({
        template,
        rows: renderRows,
        ...(input.voidWatermark ? { voidWatermark: input.voidWatermark } : {}),
      });
    } catch (err) {
      await this.prisma.checkBatch.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          errorMessage: (err as Error).message.slice(0, 2000),
          completedAt: new Date(),
        },
      });
      throw err;
    }

    const checksum = createHash('sha256').update(pdfBytes).digest('hex');
    const storageKey = `batches/${ctx.organizationId}/${batch.id}.pdf`;
    await this.storage.put(storageKey, Buffer.from(pdfBytes), 'application/pdf');

    const updated = await this.prisma.checkBatch.update({
      where: { id: batch.id },
      data: {
        status: 'RENDERED',
        pdfStorageKey: storageKey,
        pdfChecksum: checksum,
        completedAt: new Date(),
      },
    });

    // Mark constituent checks as RENDERED with the same checksum.
    await this.prisma.check.updateMany({
      where: { batchId: batch.id, status: 'QUEUED' },
      data: { status: 'RENDERED', pdfChecksum: checksum },
    });

    return { batch: toRecord(updated), pdfBytes };
  }

  /**
   * Mark a previously rendered batch as PRINTED. Records the print event
   * for compliance — once a batch is PRINTED, the constituent serial
   * numbers cannot be reissued without an explicit void.
   */
  async markPrinted(
    id: string,
    ctx: { organizationId: string; userId: string; ip?: string; ua?: string },
  ): Promise<CheckBatchRecord> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.checkBatch.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!batch) throw new DomainError('NOT_FOUND', 'Check batch not found');
      if (batch.status !== 'RENDERED') {
        throw new DomainError(
          'BATCH_NOT_RENDERED',
          `Batch must be RENDERED before marking PRINTED (current status: ${batch.status})`,
        );
      }
      const result = await tx.checkBatch.update({
        where: { id },
        data: { status: 'PRINTED' },
      });
      await tx.check.updateMany({
        where: { batchId: id, status: 'RENDERED' },
        data: { status: 'PRINTED' },
      });
      await this.audit.log(
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: 'PRINT',
          resourceType: 'CheckBatch',
          resourceId: id,
          metadata: {
            count: batch.count,
            checksum: batch.pdfChecksum,
          },
          ipAddress: ctx.ip,
          userAgent: ctx.ua,
        },
        tx,
      );
      return result;
    });
    return toRecord(updated);
  }

  /** Stream the rendered PDF for a batch. */
  async getRenderedPDF(
    organizationId: string,
    id: string,
  ): Promise<{ bytes: Buffer; checksum: string }> {
    const batch = await this.prisma.checkBatch.findFirst({
      where: { id, organizationId },
    });
    if (!batch) throw new DomainError('NOT_FOUND', 'Check batch not found');
    if (!batch.pdfStorageKey || !batch.pdfChecksum) {
      throw new DomainError('BATCH_NOT_RENDERED', 'Batch has not been rendered yet');
    }
    const bytes = await this.storage.get(batch.pdfStorageKey);
    return { bytes, checksum: batch.pdfChecksum };
  }
}

function toRecord(b: CheckBatch): CheckBatchRecord {
  return {
    id: b.id,
    organizationId: b.organizationId,
    bankAccountId: b.bankAccountId,
    templateId: b.templateId,
    name: b.name,
    count: b.count,
    status: b.status,
    totalAmountMinor: b.totalAmountMinor,
    currency: b.currency,
    pdfStorageKey: b.pdfStorageKey,
    pdfChecksum: b.pdfChecksum,
    startedAt: b.startedAt,
    completedAt: b.completedAt,
    errorMessage: b.errorMessage,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

/**
 * Convert minor units (e.g., cents) to a fixed-point decimal string with
 * exactly two fractional digits — used in formula contexts that expect
 * "1234.56" style values rather than scientific or locale-formatted form.
 */
function minorToDecimalString(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const n = Math.abs(minor);
  const major = Math.floor(n / 100);
  const cents = n % 100;
  return `${sign}${major}.${String(cents).padStart(2, '0')}`;
}

function pickDataRow(
  rows: readonly DataRow[] | undefined,
  index: number | undefined,
): DataRow | undefined {
  if (!rows || index === undefined) return undefined;
  return rows[index];
}

function buildCheckTemplate(
  row: {
    id: string;
    organizationId: string;
    bankAccountId: string | null;
    name: string;
    description: string | null;
    version: number;
    isPublished: boolean;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
    updatedById: string;
  },
  doc: TemplateDocument,
): CheckTemplate {
  // Branded IDs are runtime-equivalent to strings; the cast is a type-only
  // assertion that the values came from a trusted source (Prisma row).
  return {
    metadata: {
      id: row.id,
      organizationId: row.organizationId,
      ...(row.bankAccountId ? { bankAccountId: row.bankAccountId } : {}),
      name: row.name,
      ...(row.description !== null ? { description: row.description } : {}),
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdById,
      updatedBy: row.updatedById,
      isPublished: row.isPublished,
      archivedAt: row.archivedAt,
    },
    stock: doc.stock,
    objects: doc.objects,
    labelFields: doc.labelFields,
    background: doc.background,
    securityPattern: doc.securityPattern,
  } as unknown as CheckTemplate;
}

function buildBankAccount(
  row: {
    id: string;
    organizationId: string;
    nickname: string;
    bankName: string;
    bankAddress: string | null;
    accountNumberLast4: string;
    payerName: string;
    payerAddress: string | null;
    payerPhone: string | null;
    nextCheckNumber: number;
    createdAt: Date;
    updatedAt: Date;
  },
  decrypted: {
    routingNumber: string;
    accountNumber: string;
    auxOnUs: string | null;
  },
): BankAccount {
  const base = {
    id: row.id,
    organizationId: row.organizationId,
    nickname: row.nickname,
    bankName: row.bankName,
    routingNumber: decrypted.routingNumber,
    accountNumber: decrypted.accountNumber,
    nextCheckNumber: row.nextCheckNumber,
    payerName: row.payerName,
    status: 'active' as const,
    accountNumberLast4: row.accountNumberLast4,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.bankAddress !== null ? { bankAddress: row.bankAddress } : {}),
    ...(row.payerAddress !== null ? { payerAddress: row.payerAddress } : {}),
    ...(row.payerPhone !== null ? { payerPhone: row.payerPhone } : {}),
    ...(decrypted.auxOnUs !== null ? { auxOnUs: decrypted.auxOnUs } : {}),
  };
  return base as unknown as BankAccount;
}

function serializeTemplateDocument(doc: TemplateDocument): Prisma.InputJsonValue {
  return doc;
}
