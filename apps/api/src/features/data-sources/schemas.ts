import { DataColumnSchema, DataRowSchema } from '@biz-checks/domain';
import { z } from 'zod';

export const CreateDataSourceSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(['EMBEDDED', 'CSV', 'EXCEL']),
  columns: z.array(DataColumnSchema).min(1).max(64),
  rows: z.array(DataRowSchema).max(50_000),
  sourceFilename: z.string().max(255).optional(),
});

export const UpdateDataSourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  columns: z.array(DataColumnSchema).min(1).max(64).optional(),
  rows: z.array(DataRowSchema).max(50_000).optional(),
});

export const DataSourceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['EMBEDDED', 'CSV', 'EXCEL']),
  columns: z.array(DataColumnSchema),
  rows: z.array(DataRowSchema),
  sourceFilename: z.string().nullable(),
  rowHash: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DataSourceListSchema = z.object({
  items: z.array(
    DataSourceResponseSchema.omit({ rows: true }).extend({ rowCount: z.number().int() }),
  ),
  total: z.number().int(),
});
