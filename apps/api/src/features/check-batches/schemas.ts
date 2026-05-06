import { z } from 'zod';

export const CheckBatchRowSchema = z.object({
  payeeName: z.string().min(1).max(200),
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  memo: z.string().max(200).optional(),
  /** Optional explicit issue date per row; falls back to the batch issueDate. */
  issueDate: z.coerce.date().optional(),
  /** Optional linked-data-source row ID, in row order from the data source. */
  dataRowIndex: z.number().int().nonnegative().optional(),
  /** Free-form per-row label-field overrides (e.g., custom L# values). */
  labelFieldOverrides: z.record(z.string(), z.string()).optional(),
});
export type CheckBatchRowInput = z.infer<typeof CheckBatchRowSchema>;

export const CreateCheckBatchSchema = z.object({
  bankAccountId: z.string(),
  templateId: z.string(),
  name: z.string().min(1).max(200),
  /** ISO-4217 currency code; consistent across all rows in the batch. */
  currency: z.enum(['USD', 'CAD', 'GBP', 'EUR', 'AUD']).default('USD'),
  /** Default issue date for rows that don't override it. */
  issueDate: z.coerce.date(),
  /**
   * Optional linked data source — when set, formulas may reference Field()/FieldName().
   * The number of rows must match `rows.length` if provided.
   */
  dataSourceId: z.string().optional(),
  rows: z.array(CheckBatchRowSchema).min(1).max(5_000),
  /** When true, render with VOID watermark instead of normal output. */
  voidWatermark: z.boolean().default(false),
});
export type CreateCheckBatchInput = z.infer<typeof CreateCheckBatchSchema>;

export const CheckBatchResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  bankAccountId: z.string(),
  templateId: z.string(),
  name: z.string(),
  count: z.number().int(),
  status: z.enum(['DRAFT', 'RENDERING', 'RENDERED', 'PRINTED', 'FAILED']),
  totalAmountMinor: z.string(),
  currency: z.string(),
  pdfStorageKey: z.string().nullable(),
  pdfChecksum: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CheckBatchListSchema = z.object({
  items: z.array(CheckBatchResponseSchema),
  total: z.number().int(),
});

export const CheckBatchListQuerySchema = z.object({
  bankAccountId: z.string().optional(),
  status: z.enum(['DRAFT', 'RENDERING', 'RENDERED', 'PRINTED', 'FAILED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
