import { CanvasObjectSchema, CheckStockSchema, LabelFieldSchema, SecurityPatternSchema } from '@biz-checks/domain';
import { z } from 'zod';

export const TemplateDocumentSchema = z.object({
  stock: CheckStockSchema,
  objects: z.array(CanvasObjectSchema).max(200),
  labelFields: z.array(LabelFieldSchema).max(64).default([]),
  background: z.string().default('#ffffff'),
  securityPattern: SecurityPatternSchema.default({ kind: 'none' }),
});
export type TemplateDocument = z.infer<typeof TemplateDocumentSchema>;

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  bankAccountId: z.string().optional(),
  document: TemplateDocumentSchema,
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  bankAccountId: z.string().nullable().optional(),
  document: TemplateDocumentSchema.optional(),
});

export const TemplateResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  bankAccountId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  version: z.number().int(),
  isPublished: z.boolean(),
  archivedAt: z.string().nullable(),
  document: TemplateDocumentSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TemplateListSchema = z.object({
  items: z.array(TemplateResponseSchema),
  total: z.number().int(),
});
