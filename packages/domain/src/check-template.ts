import { z } from 'zod';

import { CanvasObjectSchema } from './canvas-object.js';
import {
  BankAccountIdSchema,
  CheckTemplateIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
} from './ids.js';
import { SecurityPatternSchema } from './security-pattern.js';
import { MarginsSchema, PaperSizeSchema, SizeSchema } from './units.js';

export const CheckStockType = [
  'top-check',
  'middle-check',
  'bottom-check',
  'three-per-page',
  'three-per-page-with-stub',
  'wallet',
  'voucher',
  'custom',
] as const;
export type CheckStockType = (typeof CheckStockType)[number];

export const CheckStockSchema = z.object({
  type: z.enum(CheckStockType),
  paperSize: PaperSizeSchema,
  rows: z.number().int().min(1).max(8),
  columns: z.number().int().min(1).max(4),
  margins: MarginsSchema,
  spacing: z.object({
    horizontal: z.number().min(0).finite(),
    vertical: z.number().min(0).finite(),
  }),
  /** Size of one individual check on the sheet (computed or custom). */
  checkSize: SizeSchema,
  perforationBottom: z.number().min(0).finite().default(0),
});
export type CheckStock = z.infer<typeof CheckStockSchema>;

export const LabelFieldSchema = z.discriminatedUnion('kind', [
  z.object({
    name: z.string().min(1).max(64),
    kind: z.literal('constant'),
    value: z.string().max(512),
  }),
  z.object({
    name: z.string().min(1).max(64),
    kind: z.literal('incrementing'),
    /** Next value to be issued. Persists across print jobs. */
    next: z.number().int().nonnegative(),
    step: z.number().int().positive().default(1),
    pad: z.number().int().min(0).max(20).default(0),
  }),
]);
export type LabelField = z.infer<typeof LabelFieldSchema>;

export const TemplateMetadataSchema = z.object({
  id: CheckTemplateIdSchema,
  organizationId: OrganizationIdSchema,
  bankAccountId: BankAccountIdSchema.optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  version: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: UserIdSchema,
  updatedBy: UserIdSchema,
  isPublished: z.boolean().default(false),
  archivedAt: z.coerce.date().nullable().default(null),
});
export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>;

export const CheckTemplateSchema = z.object({
  metadata: TemplateMetadataSchema,
  stock: CheckStockSchema,
  objects: z.array(CanvasObjectSchema).max(200),
  labelFields: z.array(LabelFieldSchema).max(64).default([]),
  /** Background color of the canvas in the designer (white check stock by default). */
  background: z.string().default('#ffffff'),
  /** Optional security background drawn under all canvas objects. */
  securityPattern: SecurityPatternSchema.default({ kind: 'none' }),
});
export type CheckTemplate = z.infer<typeof CheckTemplateSchema>;
