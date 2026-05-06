'use client';

import { Plus, Printer, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import type {
  BankAccountDTO,
  CheckBatchDTO,
  CheckBatchRowInput,
  CheckBatchStatus,
  CreateCheckBatchInput,
  Currency,
  DataSourceDTO,
  PaginatedDTO,
  TemplateDTO,
} from '@/lib/api/types';
import { clientId, formatDateTime, formatMinor, parseDollarsToMinor } from '@/lib/format';
import { useToast } from '@/lib/ui/toast';

const STATUS_TONES: Record<CheckBatchStatus, BadgeTone> = {
  DRAFT: 'gray',
  RENDERING: 'blue',
  RENDERED: 'purple',
  PRINTED: 'green',
  FAILED: 'red',
};

export default function BatchesPage(): React.JSX.Element {
  const batches = useApi<PaginatedDTO<CheckBatchDTO>>('/api/v1/check-batches');
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Batches</h1>
          <p className="text-sm text-gray-600">
            Create high-volume print runs from inline rows or a CSV data source.
          </p>
        </div>
        <Button
          onClick={() => setShowWizard((v) => !v)}
          iconLeft={<Plus className="size-4" />}
        >
          {showWizard ? 'Close wizard' : 'New batch'}
        </Button>
      </div>

      {showWizard ? (
        <div className="mb-6">
          <CreateBatchWizard
            onClose={() => setShowWizard(false)}
            onCreated={() => void batches.mutate()}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader title="All batches" description={`${batches.data?.total ?? 0} total`} />
        <CardBody className="p-0">
          {batches.isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : batches.data && batches.data.items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Count</th>
                  <th className="px-5 py-2 font-medium">Total</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Created</th>
                  <th className="px-5 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.data.items.map((b) => (
                  <tr key={b.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <Link href={`/batches/${b.id}` as never} className="hover:text-brand-700">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-gray-700">{b.count}</td>
                    <td className="px-5 py-3 tabular-nums text-gray-900">
                      {formatMinor(b.totalAmountMinor, b.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONES[b.status]}>{b.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDateTime(b.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/batches/${b.id}` as never}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              icon={<Printer className="size-8" />}
              title="No batches yet"
              description="Pick a published template and a bank account, then add rows or import a CSV."
              action={
                <Button onClick={() => setShowWizard(true)} iconLeft={<Plus className="size-4" />}>
                  New batch
                </Button>
              }
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

const today = (): string => new Date().toISOString().slice(0, 10);

interface DraftRow {
  key: string;
  payeeName: string;
  amountInput: string;
  memo: string;
  issueDateOverride: string;
}

const blankRow = (): DraftRow => ({
  key: clientId('row'),
  payeeName: '',
  amountInput: '',
  memo: '',
  issueDateOverride: '',
});

function CreateBatchWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const accounts = useApi<PaginatedDTO<BankAccountDTO>>('/api/v1/bank-accounts');
  const templates = useApi<PaginatedDTO<TemplateDTO>>('/api/v1/templates');
  const sources = useApi<PaginatedDTO<DataSourceDTO>>('/api/v1/data-sources');

  const [name, setName] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [issueDate, setIssueDate] = useState<string>(today());
  const [voidWatermark, setVoidWatermark] = useState(false);
  const [rowMode, setRowMode] = useState<'inline' | 'data-source'>('inline');
  const [dataSourceId, setDataSourceId] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([blankRow(), blankRow()]);
  const [error, setError] = useState<string | null>(null);

  const sourceDetail = useApi<DataSourceDTO>(
    rowMode === 'data-source' && dataSourceId ? `/api/v1/data-sources/${dataSourceId}` : null,
  );

  const create = useApiMutation<CreateCheckBatchInput, CheckBatchDTO>(
    () => '/api/v1/check-batches',
    {
      method: 'POST',
      body: (input) => input,
      idempotencyKey: () => clientId('idem').replace(/^[^_]+_/, 'idem_'),
    },
  );

  const validTemplates = useMemo(
    () => templates.data?.items.filter((t) => !t.archivedAt && t.isPublished) ?? [],
    [templates.data],
  );

  // When switching to data-source mode, replace rows with a column-mapped view
  // of the chosen source. Column lookup is case-insensitive.
  useEffect(() => {
    if (rowMode !== 'data-source') return;
    const data = sourceDetail.data;
    if (!data || !data.rows) return;
    const cols = data.columns.map((c) => c.name);
    const findCol = (...candidates: string[]): string | null => {
      for (const cand of candidates) {
        const found = cols.find((c) => c.toLowerCase() === cand.toLowerCase());
        if (found) return found;
      }
      return null;
    };
    const payeeCol = findCol('payee', 'payee_name', 'name', 'recipient');
    const amountCol = findCol('amount', 'value', 'total', 'gross');
    const memoCol = findCol('memo', 'description', 'notes');
    setRows(
      data.rows.map((r) => ({
        key: clientId('row'),
        payeeName: payeeCol ? String(r[payeeCol] ?? '') : '',
        amountInput: amountCol ? String(r[amountCol] ?? '') : '',
        memo: memoCol ? String(r[memoCol] ?? '') : '',
        issueDateOverride: '',
      })),
    );
  }, [rowMode, sourceDetail.data]);

  const submit = async (): Promise<void> => {
    setError(null);
    if (!name.trim()) return setError('Batch name is required.');
    if (!bankAccountId) return setError('Pick a bank account.');
    if (!templateId) return setError('Pick a published template.');
    if (rowMode === 'data-source' && !dataSourceId) return setError('Pick a data source.');
    if (rows.length === 0) return setError('At least one row is required.');

    const apiRows: CheckBatchRowInput[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      if (!r.payeeName.trim() || !r.amountInput.trim()) {
        return setError(`Row ${i + 1}: payee and amount are required.`);
      }
      const minor = parseDollarsToMinor(r.amountInput);
      if (minor === null || minor < 0) return setError(`Row ${i + 1}: invalid amount.`);
      apiRows.push({
        payeeName: r.payeeName.trim(),
        amountMinor: minor,
        ...(r.memo.trim() ? { memo: r.memo.trim() } : {}),
        ...(r.issueDateOverride ? { issueDate: r.issueDateOverride } : {}),
      });
    }

    try {
      const created = await create.trigger({
        name: name.trim(),
        bankAccountId,
        templateId,
        currency,
        issueDate,
        ...(rowMode === 'data-source' ? { dataSourceId } : {}),
        rows: apiRows,
        voidWatermark,
      });
      toast.success('Batch created', `${created.count} checks queued`);
      onCreated();
      onClose();
      router.push(`/batches/${created.id}` as never);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create batch');
    }
  };

  const totalMinor = useMemo(() => {
    let total = 0n;
    for (const r of rows) {
      const m = parseDollarsToMinor(r.amountInput);
      if (m !== null) total += BigInt(m);
    }
    return total;
  }, [rows]);

  return (
    <Card>
      <CardHeader
        title="New batch"
        description="Configure once, then preview and download a multi-page PDF."
      />
      <CardBody className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="batch-name"
            label="Batch name"
            value={name}
            placeholder="e.g. February vendor payments"
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="batch-date"
            type="date"
            label="Default issue date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
          <Select
            id="batch-bank"
            label="Bank account"
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
          >
            <option value="">— Choose —</option>
            {accounts.data?.items
              .filter((a) => a.status === 'ACTIVE')
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nickname} · {a.bankName}
                </option>
              ))}
          </Select>
          <Select
            id="batch-tpl"
            label="Template"
            description={
              validTemplates.length === 0 ? 'No published templates yet — publish one first.' : undefined
            }
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">— Choose —</option>
            {validTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · v{t.version}
              </option>
            ))}
          </Select>
          <Select
            id="batch-currency"
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option>USD</option>
            <option>CAD</option>
            <option>GBP</option>
            <option>EUR</option>
            <option>AUD</option>
          </Select>
          <label className="flex items-end gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={voidWatermark}
              onChange={(e) => setVoidWatermark(e.target.checked)}
              className="size-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="pb-1">
              Render with <strong>VOID</strong> watermark (test prints)
            </span>
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Row source</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRowMode('inline')}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                rowMode === 'inline'
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Inline rows
            </button>
            <button
              type="button"
              onClick={() => setRowMode('data-source')}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                rowMode === 'data-source'
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              From data source
            </button>
          </div>
        </div>

        {rowMode === 'data-source' ? (
          <Select
            id="batch-ds"
            label="Data source"
            value={dataSourceId}
            onChange={(e) => setDataSourceId(e.target.value)}
            description="Rows are read from columns Payee, Amount, Memo when present."
          >
            <option value="">— Choose —</option>
            {sources.data?.items.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.kind})
              </option>
            ))}
          </Select>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">
              Rows · {rows.length} {rowMode === 'data-source' ? '(from data source)' : '(editable)'}
            </label>
            {rowMode === 'inline' ? (
              <Button
                size="sm"
                variant="outline"
                iconLeft={<Plus className="size-3.5" />}
                onClick={() => setRows((rs) => [...rs, blankRow()])}
              >
                Add row
              </Button>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-md border border-gray-200">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-[10px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="w-10 px-2 py-1.5 font-medium">#</th>
                  <th className="px-2 py-1.5 font-medium">Payee</th>
                  <th className="w-32 px-2 py-1.5 font-medium">Amount</th>
                  <th className="px-2 py-1.5 font-medium">Memo</th>
                  <th className="w-36 px-2 py-1.5 font-medium">Issue date</th>
                  <th className="w-8 px-2 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={r.key}>
                    <td className="px-2 py-1.5 font-mono text-gray-500">{i + 1}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.payeeName}
                        onChange={(e) =>
                          setRows((rs) =>
                            rs.map((x) => (x.key === r.key ? { ...x, payeeName: e.target.value } : x)),
                          )
                        }
                        disabled={rowMode === 'data-source'}
                        className="w-full rounded border border-transparent px-1 py-0.5 text-xs focus:border-brand-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={r.amountInput}
                        onChange={(e) =>
                          setRows((rs) =>
                            rs.map((x) =>
                              x.key === r.key ? { ...x, amountInput: e.target.value } : x,
                            ),
                          )
                        }
                        disabled={rowMode === 'data-source'}
                        className="w-full rounded border border-transparent px-1 py-0.5 text-right font-mono text-xs tabular-nums focus:border-brand-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.memo}
                        onChange={(e) =>
                          setRows((rs) =>
                            rs.map((x) => (x.key === r.key ? { ...x, memo: e.target.value } : x)),
                          )
                        }
                        disabled={rowMode === 'data-source'}
                        className="w-full rounded border border-transparent px-1 py-0.5 text-xs focus:border-brand-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={r.issueDateOverride}
                        onChange={(e) =>
                          setRows((rs) =>
                            rs.map((x) =>
                              x.key === r.key ? { ...x, issueDateOverride: e.target.value } : x,
                            ),
                          )
                        }
                        disabled={rowMode === 'data-source'}
                        className="w-full rounded border border-transparent px-1 py-0.5 text-xs focus:border-brand-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </td>
                    <td className="px-1 py-1 text-right">
                      {rowMode === 'inline' && rows.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                          className="rounded px-1 text-[10px] text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Remove row"
                        >
                          ×
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-end gap-2 text-xs text-gray-600">
            <span>Total:</span>
            <span className="font-mono tabular-nums text-gray-900">
              {formatMinor(totalMinor, currency)}
            </span>
          </div>
        </div>

        {error ? (
          <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            isLoading={create.isMutating}
            iconLeft={<Upload className="size-4" />}
          >
            Create batch
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

