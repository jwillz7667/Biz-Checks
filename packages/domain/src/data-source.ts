import { z } from 'zod';

import { DataSourceIdSchema, OrganizationIdSchema, UserIdSchema } from './ids.js';

export const DataSourceKind = ['embedded', 'csv', 'excel'] as const;
export type DataSourceKind = (typeof DataSourceKind)[number];

export const DataColumnSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['string', 'number', 'date', 'currency']).default('string'),
});
export type DataColumn = z.infer<typeof DataColumnSchema>;

export const DataRowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));
export type DataRow = z.infer<typeof DataRowSchema>;

export const DataSourceSchema = z.object({
  id: DataSourceIdSchema,
  organizationId: OrganizationIdSchema,
  name: z.string().min(1).max(200),
  kind: z.enum(DataSourceKind),
  columns: z.array(DataColumnSchema).min(1).max(64),
  rows: z.array(DataRowSchema).max(50_000),
  /** Source filename for csv/excel sources, used purely for auditing. */
  sourceFilename: z.string().max(255).nullable().default(null),
  rowHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: UserIdSchema,
});
export type DataSource = z.infer<typeof DataSourceSchema>;
