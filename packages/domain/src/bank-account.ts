import { z } from 'zod';

import { BankAccountIdSchema, OrganizationIdSchema } from './ids.js';

/**
 * U.S. ABA routing number — exactly 9 digits, mod-10 checksum validated
 * by the @biz-checks/micr package.
 */
export const RoutingNumberSchema = z
  .string()
  .regex(/^\d{9}$/, 'Routing number must be exactly 9 digits');
export type RoutingNumber = z.infer<typeof RoutingNumberSchema>;

/**
 * Account number — bank-defined, typically 4-17 digits in the US.
 * Stored encrypted at rest at the persistence layer; the domain treats
 * it as opaque numeric text.
 */
export const AccountNumberSchema = z
  .string()
  .regex(/^\d{4,17}$/, 'Account number must be 4-17 digits');
export type AccountNumber = z.infer<typeof AccountNumberSchema>;

/** Auxiliary On-Us field for international/business checks (optional). */
export const AuxOnUsSchema = z
  .string()
  .regex(/^\d{0,15}$/, 'Aux on-us must be 0-15 digits')
  .optional();

/** Trailing check number transit-position (some stocks place it here). */
export const TransitFieldSchema = z
  .string()
  .regex(/^\d{1,15}$/, 'Transit field must be 1-15 digits')
  .optional();

export const BankAccountStatus = ['active', 'inactive', 'closed'] as const;
export type BankAccountStatus = (typeof BankAccountStatus)[number];

export const BankAccountSchema = z.object({
  id: BankAccountIdSchema,
  organizationId: OrganizationIdSchema,
  /** Internal nickname only — never printed on a check. */
  nickname: z.string().min(1).max(120),
  bankName: z.string().min(1).max(200),
  bankAddress: z.string().max(500).optional(),
  routingNumber: RoutingNumberSchema,
  accountNumber: AccountNumberSchema,
  auxOnUs: AuxOnUsSchema,
  /** Auto-incrementing check number for the next print. */
  nextCheckNumber: z.number().int().min(1).max(999_999_999),
  /** Display-only: company name printed on the check face. */
  payerName: z.string().min(1).max(200),
  payerAddress: z.string().max(500).optional(),
  payerPhone: z.string().max(40).optional(),
  status: z.enum(BankAccountStatus).default('active'),
  /** Last 4 digits cached unencrypted for UI display. */
  accountNumberLast4: z.string().length(4).regex(/^\d{4}$/),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type BankAccount = z.infer<typeof BankAccountSchema>;

/** Public-safe view of a bank account — never includes the full account number. */
export type BankAccountSummary = Omit<BankAccount, 'accountNumber' | 'auxOnUs'>;
