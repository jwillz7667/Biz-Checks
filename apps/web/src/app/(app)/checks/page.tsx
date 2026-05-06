'use client';

import { FileText, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type {
  BankAccountDTO,
  CheckDTO,
  CheckStatus,
  CreateCheckInput,
  Currency,
  PaginatedDTO,
  TemplateDTO,
} from '@/lib/api/types';

import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/client';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import { formatDate, formatMinor, parseDollarsToMinor } from '@/lib/format';
import { useToast } from '@/lib/ui/toast';

const STATUS_TONES: Record<CheckStatus, BadgeTone> = {
  DRAFT: 'gray',
  QUEUED: 'blue',
  RENDERED: 'purple',
  PRINTED: 'green',
  VOIDED: 'red',
  REISSUED: 'yellow',
};

export default function ChecksPage(): React.JSX.Element {
  const checks = useApi<PaginatedDTO<CheckDTO>>('/api/v1/checks');
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Checks</h1>
          <p className="text-sm text-gray-600">
            Create individual checks. For high-volume printing, use a batch instead.
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          iconLeft={showForm ? <X className="size-4" /> : <Plus className="size-4" />}
        >
          {showForm ? 'Cancel' : 'New check'}
        </Button>
      </div>

      {showForm ? (
        <div className="mb-6">
          <CreateCheckForm
            onClose={() => setShowForm(false)}
            mutateList={() => void checks.mutate()}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader title="All checks" description={`${checks.data?.total ?? 0} total`} />
        <CardBody className="p-0">
          {checks.isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : checks.data && checks.data.items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="px-5 py-2 font-medium">Payee</th>
                  <th className="px-5 py-2 font-medium">Amount</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Memo</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checks.data.items.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3 font-mono tabular-nums text-gray-700">{c.serialNumber}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{c.payeeName}</td>
                    <td className="px-5 py-3 tabular-nums text-gray-900">
                      {formatMinor(c.amountMinor, c.currency)}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{formatDate(c.issueDate)}</td>
                    <td className="px-5 py-3 truncate text-gray-500">{c.memo ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONES[c.status]}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              icon={<FileText className="size-8" />}
              title="No checks yet"
              description="Create a one-off check or build a batch from a CSV."
              action={
                <Button onClick={() => setShowForm(true)} iconLeft={<Plus className="size-4" />}>
                  New check
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

function CreateCheckForm({
  onClose,
  mutateList,
}: {
  onClose: () => void;
  mutateList: () => void;
}): React.JSX.Element {
  const toast = useToast();
  const accounts = useApi<PaginatedDTO<BankAccountDTO>>('/api/v1/bank-accounts');
  const templates = useApi<PaginatedDTO<TemplateDTO>>('/api/v1/templates');

  const [bankAccountId, setBankAccountId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [memo, setMemo] = useState('');
  const [issueDate, setIssueDate] = useState<string>(today());
  const [error, setError] = useState<string | null>(null);

  const create = useApiMutation<CreateCheckInput, CheckDTO>(
    () => '/api/v1/checks',
    { method: 'POST', body: (input) => input },
  );

  const validTemplates = useMemo(
    () => templates.data?.items.filter((t) => !t.archivedAt && t.isPublished) ?? [],
    [templates.data],
  );

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    const minor = parseDollarsToMinor(amountInput);
    if (!bankAccountId) return setError('Pick a bank account.');
    if (!templateId) return setError('Pick a template.');
    if (!payeeName.trim()) return setError('Payee is required.');
    if (minor === null || minor < 0) return setError('Amount is invalid.');
    try {
      await create.trigger({
        bankAccountId,
        templateId,
        payeeName: payeeName.trim(),
        amountMinor: minor,
        currency,
        ...(memo.trim() ? { memo: memo.trim() } : {}),
        issueDate,
      });
      toast.success('Check created');
      mutateList();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create check');
    }
  };

  return (
    <Card>
      <CardHeader
        title="New check"
        description="A single check, queued for rendering. For batches, use the Batches page."
        actions={
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
            <X className="size-4" />
          </button>
        }
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            id="check-bank"
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
            id="check-tpl"
            label="Template"
            description={
              validTemplates.length === 0 && !templates.isLoading
                ? 'No published templates yet — publish one in the designer.'
                : undefined
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

          <Input
            id="check-payee"
            label="Payee"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            placeholder="Acme Corp"
          />
          <div className="grid grid-cols-[1fr,90px] gap-2">
            <Input
              id="check-amount"
              label="Amount"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
            />
            <Select
              id="check-currency"
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
          </div>
          <Input
            id="check-date"
            type="date"
            label="Issue date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Textarea
              id="check-memo"
              label="Memo"
              placeholder="Optional"
              maxLength={200}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {error ? (
            <div role="alert" className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="col-span-full flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={create.isMutating}>
              Create check
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
