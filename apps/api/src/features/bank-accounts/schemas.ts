import { z } from 'zod';

export const CreateBankAccountSchema = z.object({
  nickname: z.string().min(1).max(120),
  bankName: z.string().min(1).max(200),
  bankAddress: z.string().max(500).optional(),
  routingNumber: z.string().regex(/^\d{9}$/),
  accountNumber: z.string().regex(/^\d{4,17}$/),
  auxOnUs: z.string().regex(/^\d{0,15}$/).optional(),
  payerName: z.string().min(1).max(200),
  payerAddress: z.string().max(500).optional(),
  payerPhone: z.string().max(40).optional(),
  nextCheckNumber: z.number().int().min(1).max(999_999_999).default(1001),
});
export type CreateBankAccountInput = z.infer<typeof CreateBankAccountSchema>;

export const UpdateBankAccountSchema = CreateBankAccountSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']).optional(),
});

export const BankAccountResponseSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  bankName: z.string(),
  bankAddress: z.string().nullable(),
  routingNumber: z.string(),
  accountNumberLast4: z.string(),
  payerName: z.string(),
  payerAddress: z.string().nullable(),
  payerPhone: z.string().nullable(),
  nextCheckNumber: z.number().int(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const BankAccountListSchema = z.object({
  items: z.array(BankAccountResponseSchema),
  total: z.number().int(),
});
