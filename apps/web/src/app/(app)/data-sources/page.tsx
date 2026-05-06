'use client';

import { Database, Plus, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import type { DataSourceDTO, ImportCSVInput, PaginatedDTO } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { useToast } from '@/lib/ui/toast';

const MAX_CSV_BYTES = 10 * 1024 * 1024;

export default function DataSourcesPage(): React.JSX.Element {
  const sources = useApi<PaginatedDTO<DataSourceDTO>>('/api/v1/data-sources');
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Data sources</h1>
          <p className="text-sm text-gray-600">
            Upload CSV files to drive batch checks. Columns map to template fields.
          </p>
        </div>
        <Button
          onClick={() => setShowImport((v) => !v)}
          iconLeft={showImport ? <X className="size-4" /> : <Plus className="size-4" />}
        >
          {showImport ? 'Cancel' : 'Import CSV'}
        </Button>
      </div>

      {showImport ? (
        <div className="mb-6">
          <ImportCSVForm
            onClose={() => setShowImport(false)}
            mutateList={() => void sources.mutate()}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader title="All data sources" description={`${sources.data?.total ?? 0} total`} />
        <CardBody className="p-0">
          {sources.isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : sources.data && sources.data.items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Kind</th>
                  <th className="px-5 py-2 font-medium">Columns</th>
                  <th className="px-5 py-2 font-medium">Rows</th>
                  <th className="px-5 py-2 font-medium">Filename</th>
                  <th className="px-5 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sources.data.items.map((d) => (
                  <tr key={d.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-5 py-3">
                      <Badge tone={d.kind === 'CSV' ? 'blue' : 'purple'}>{d.kind}</Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {d.columns.slice(0, 5).map((c) => (
                          <span
                            key={c.name}
                            className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700"
                          >
                            {c.name}
                          </span>
                        ))}
                        {d.columns.length > 5 ? (
                          <span className="text-xs text-gray-500">+{d.columns.length - 5} more</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-gray-700">{d.rowCount ?? '—'}</td>
                    <td className="px-5 py-3 truncate text-gray-500">
                      <span className="font-mono text-xs">{d.sourceFilename ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDateTime(d.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              icon={<Database className="size-8" />}
              title="No data sources yet"
              description="Import a CSV with columns like Payee, Amount, Memo to drive batch printing."
              action={
                <Button onClick={() => setShowImport(true)} iconLeft={<Upload className="size-4" />}>
                  Import CSV
                </Button>
              }
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function ImportCSVForm({
  onClose,
  mutateList,
}: {
  onClose: () => void;
  mutateList: () => void;
}): React.JSX.Element {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importCsv = useApiMutation<ImportCSVInput, DataSourceDTO>(
    () => '/api/v1/data-sources/import-csv',
    { method: 'POST', body: (input) => input },
  );

  const handlePick = (file: File): void => {
    if (file.size > MAX_CSV_BYTES) {
      setError('File is too large (max 10 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setText(result);
      setFilename(file.name);
      if (!name) setName(file.name.replace(/\.[^.]+$/, ''));
      setError(null);
    };
    reader.onerror = () => setError('Could not read file.');
    reader.readAsText(file);
  };

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    if (!name.trim()) return setError('Name is required.');
    if (!text.trim()) return setError('Pick a CSV file first.');
    try {
      await importCsv.trigger({
        name: name.trim(),
        text,
        ...(filename ? { sourceFilename: filename } : {}),
      });
      toast.success('Data source imported');
      mutateList();
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Import failed';
      setError(message);
    }
  };

  const previewRows = parsePreview(text);

  return (
    <Card>
      <CardHeader
        title="Import CSV data source"
        description="First row is treated as headers. Headers become column names."
        actions={
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
            <X className="size-4" />
          </button>
        }
      />
      <CardBody className="space-y-4">
        <Input
          id="ds-name"
          label="Name"
          placeholder="e.g. February payroll"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">CSV file</label>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePick(file);
              }}
            />
            <Button
              variant="outline"
              type="button"
              onClick={() => fileRef.current?.click()}
              iconLeft={<Upload className="size-4" />}
            >
              Choose file
            </Button>
            {filename ? (
              <span className="font-mono text-xs text-gray-600">{filename}</span>
            ) : (
              <span className="text-xs text-gray-500">No file selected</span>
            )}
          </div>
        </div>

        {previewRows.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-gray-200">
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
              Preview · {previewRows.length} rows
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white text-left">
                  <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
                    {previewRows[0]?.map((h, i) => (
                      <th key={i} className="px-3 py-1.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(1, 6).map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 font-mono text-gray-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} isLoading={importCsv.isMutating}>
            Import
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/** Cheap preview-only parser. The server does the authoritative parse. */
function parsePreview(text: string): string[][] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.slice(0, 6).map((l) => splitCSVLine(l));
}

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
    } else if (c === ',') {
      out.push(current);
      current = '';
    } else if (c === '"') {
      inQuotes = true;
    } else {
      current += c ?? '';
    }
  }
  out.push(current);
  return out;
}
