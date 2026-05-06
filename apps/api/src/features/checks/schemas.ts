import { z } from 'zod';

export const CreateCheckSchema = z.object({
  bankAccountId: z.string(),
  templateId: z.string(),
  payeeName: z.string().min(1).max(200),
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: z.enum(['USD', 'CAD', 'GBP', 'EUR', 'AUD']).default('USD'),
  memo: z.string().max(200).optional(),
  issueDate: z.coerce.date(),
});

export const VoidCheckSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const CheckResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  bankAccountId: z.string(),
  templateId: z.string(),
  batchId: z.string().nullable(),
  serialNumber: z.number().int(),
  payeeName: z.string(),
  amountMinor: z.string(),
  currency: z.string(),
  memo: z.string().nullable(),
  issueDate: z.string(),
  status: z.enum(['DRAFT', 'QUEUED', 'RENDERED', 'PRINTED', 'VOIDED', 'REISSUED']),
  pdfChecksum: z.string().nullable(),
  voidedAt: z.string().nullable(),
  voidReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CheckListSchema = z.object({
  items: z.array(CheckResponseSchema),
  total: z.number().int(),
});

export const CheckListQuerySchema = z.object({
  bankAccountId: z.string().optional(),
  status: z.enum(['DRAFT', 'QUEUED', 'RENDERED', 'PRINTED', 'VOIDED', 'REISSUED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
