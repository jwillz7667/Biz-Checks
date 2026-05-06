import { createHash } from 'node:crypto';

import { DomainError, type DataColumn, type DataRow } from '@biz-checks/domain';

import type { AuditWriter } from '../../shared/middleware/audit.js';
import type { DataSource, DataSourceKind, PrismaClient } from '@prisma/client';


export interface DataSourceRecord {
  id: string;
  name: string;
  kind: DataSourceKind;
  columns: DataColumn[];
  rows: DataRow[];
  sourceFilename: string | null;
  rowHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DataSourceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditWriter,
  ) {}

  async list(organizationId: string): Promise<{ items: DataSource[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.dataSource.findMany({ where: { organizationId }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.dataSource.count({ where: { organizationId } }),
    ]);
    return { items, total };
  }

  async get(organizationId: string, id: string): Promise<DataSourceRecord> {
    const found = await this.prisma.dataSource.findFirst({ where: { id, organizationId } });
    if (!found) throw new DomainError('NOT_FOUND', 'Data source not found');
    return toRecord(found);
  }

  async create(
    input: {
      name: string;
      kind: DataSourceKind;
      columns: DataColumn[];
      rows: DataRow[];
      sourceFilename?: string;
    },
    ctx: { organizationId: string; userId: string; ip?: string; ua?: string },
  ): Promise<DataSourceRecord> {
    const rowHash = hashRows(input.rows);
    const created = await this.prisma.$transaction(async (tx) => {
      const ds = await tx.dataSource.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          kind: input.kind,
          columns: input.columns,
          rows: input.rows,
          sourceFilename: input.sourceFilename ?? null,
          rowHash,
          createdById: ctx.userId,
        },
      });
      await this.audit.log(
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          action: 'CREATE',
          resourceType: 'DataSource',
          resourceId: ds.id,
          metadata: { name: ds.name, kind: ds.kind, rowCount: input.rows.length },
          ipAddress: ctx.ip,
          userAgent: ctx.ua,
        },
        tx,
      );
      return ds;
    });
    return toRecord(created);
  }

  async update(
    id: string,
    input: { name?: string; columns?: DataColumn[]; rows?: DataRow[] },
    ctx: { organizationId: string; userId: string },
  ): Promise<DataSourceRecord> {
    const updated = await this.prisma.dataSource.updateMany({
      where: { id, organizationId: ctx.organizationId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.columns !== undefined
          ? { columns: input.columns }
          : {}),
        ...(input.rows !== undefined
          ? {
              rows: input.rows,
              rowHash: hashRows(input.rows),
            }
          : {}),
      },
    });
    if (updated.count === 0) throw new DomainError('NOT_FOUND', 'Data source not found');
    return this.get(ctx.organizationId, id);
  }

  async delete(id: string, ctx: { organizationId: string }): Promise<void> {
    const res = await this.prisma.dataSource.deleteMany({
      where: { id, organizationId: ctx.organizationId },
    });
    if (res.count === 0) throw new DomainError('NOT_FOUND', 'Data source not found');
  }
}

function toRecord(d: DataSource): DataSourceRecord {
  return {
    id: d.id,
    name: d.name,
    kind: d.kind,
    columns: d.columns as unknown as DataColumn[],
    rows: d.rows as unknown as DataRow[],
    sourceFilename: d.sourceFilename,
    rowHash: d.rowHash,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function hashRows(rows: DataRow[]): string {
  const stable = JSON.stringify(rows);
  return createHash('sha256').update(stable).digest('hex');
}

/**
 * Parse a CSV text body into columns + rows. Handles quoted values, escaped
 * quotes, and CRLF/LF line endings. Strict — any malformed row fails fast.
 */
export function parseCSV(text: string): { columns: DataColumn[]; rows: DataRow[] } {
  const lines = splitCSVLines(text);
  if (lines.length === 0) return { columns: [], rows: [] };

  const headerLine = lines[0];
  if (headerLine === undefined) return { columns: [], rows: [] };
  const headers = parseCSVLine(headerLine);
  const columns: DataColumn[] = headers.map((name) => ({ name: name.trim(), type: 'string' }));

  const rows: DataRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined || line.trim().length === 0) continue;
    const cells = parseCSVLine(line);
    if (cells.length !== headers.length) {
      throw new DomainError('VALIDATION_FAILED', `Row ${i + 1} has ${cells.length} cells; expected ${headers.length}`);
    }
    const row: DataRow = {};
    for (let c = 0; c < headers.length; c += 1) {
      const headerName = headers[c];
      const cellValue = cells[c];
      if (headerName !== undefined) row[headerName] = cellValue ?? '';
    }
    rows.push(row);
  }
  return { columns, rows };
}

function splitCSVLines(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      cur += c;
      continue;
    }
    if ((c === '\n' || c === '\r') && !inQuotes) {
      if (cur.length > 0) out.push(cur);
      cur = '';
      // skip CRLF pair
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      continue;
    }
    cur += c;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      cur += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}
