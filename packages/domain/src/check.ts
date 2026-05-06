import { z } from 'zod';

import { MoneySchema } from './currency.js';
import {
  BankAccountIdSchema,
  CheckBatchIdSchema,
  CheckIdSchema,
  CheckTemplateIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
} from './ids.js';

export const CheckStatus = [
  'draft',
  'queued',
  'rendered',
  'printed',
  'voided',
  'reissued',
] as const;
export type CheckStatus = (typeof CheckStatus)[number];

export const CheckSchema = z.object({
  id: CheckIdSchema,
  organizationId: OrganizationIdSchema,
  bankAccountId: BankAccountIdSchema,
  templateId: CheckTemplateIdSchema,
  batchId: CheckBatchIdSchema.optional(),

  /** Sequence-allocated number for this check. Always unique per bank account. */
  serialNumber: z.number().int().min(1).max(999_999_999),

  payeeName: z.string().min(1).max(200),
  amount: MoneySchema,
  memo: z.string().max(200).optional(),
  issueDate: z.coerce.date(),

  /** Snapshot of all dynamic field values at print time, for audit reproducibility. */
  fieldSnapshot: z.record(z.string(), z.string()).default({}),

  status: z.enum(CheckStatus).default('draft'),
  /** SHA-256 of the rendered PDF — proves render integrity for audit. */
  pdfChecksum: z.string().regex(/^[a-f0-9]{64}$/).optional(),

  voidedAt: z.coerce.date().nullable().default(null),
  voidedBy: UserIdSchema.nullable().default(null),
  voidReason: z.string().max(500).nullable().default(null),

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: UserIdSchema,
});
export type Check = z.infer<typeof CheckSchema>;

export const CheckBatchSchema = z.object({
  id: CheckBatchIdSchema,
  organizationId: OrganizationIdSchema,
  bankAccountId: BankAccountIdSchema,
  templateId: CheckTemplateIdSchema,
  name: z.string().min(1).max(200),
  /** Number of checks in batch. Locked once issued. */
  count: z.number().int().positive().max(10_000),
  /** Idempotency key from API client to prevent duplicate batches. */
  idempotencyKey: z.string().min(8).max(255),
  status: z.enum(['draft', 'rendering', 'rendered', 'printed', 'failed']).default('draft'),
  /** Total dollar amount across the batch (sum of check amounts). */
  totalAmount: MoneySchema,
  pdfStorageKey: z.string().nullable().default(null),
  startedAt: z.coerce.date().nullable().default(null),
  completedAt: z.coerce.date().nullable().default(null),
  errorMessage: z.string().max(2000).nullable().default(null),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: UserIdSchema,
});
export type CheckBatch = z.infer<typeof CheckBatchSchema>;
