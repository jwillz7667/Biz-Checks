'use client';

import { Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type {
  BankAccountDTO,
  CreateTemplateInput,
  PaginatedDTO,
  TemplateDTO,
} from '@/lib/api/types';

import { TemplatesBlueprint } from '@/components/illustrations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import { formatDateTime } from '@/lib/format';
import {
  StockOptions,
  buildBlankDocument,
  buildBlueprintDocument,
  buildSecurityDocument,
  type StockId,
} from '@/lib/templates/blueprints';
import { useToast } from '@/lib/ui/toast';

export default function TemplatesPage(): React.JSX.Element {
  const templates = useApi<PaginatedDTO<TemplateDTO>>('/api/v1/templates');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Templates</h1>
          <p className="text-sm text-gray-600">
            Design reusable check layouts with bank-specific MICR data and field mappings.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate((v) => !v)}
          iconLeft={showCreate ? <X className="size-4" /> : <Plus className="size-4" />}
        >
          {showCreate ? 'Cancel' : 'New template'}
        </Button>
      </div>

      {showCreate ? (
        <div className="mb-6">
          <CreateTemplateForm
            onClose={() => setShowCreate(false)}
            mutateList={() => void templates.mutate()}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader title="All templates" description={`${templates.data?.total ?? 0} total`} />
        <CardBody className="p-0">
          {templates.isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : templates.data && templates.data.items.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {templates.data.items.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/templates/${t.id}`}
                        className="truncate font-medium text-gray-900 hover:text-brand-700"
                      >
                        {t.name}
                      </Link>
                      <Badge tone={t.isPublished ? 'green' : 'gray'}>
                        {t.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                      <Badge tone="blue">v{t.version}</Badge>
                      {t.archivedAt ? <Badge tone="yellow">Archived</Badge> : null}
                    </div>
                    {t.description ? (
                      <p className="mt-0.5 truncate text-xs text-gray-500">{t.description}</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-gray-400">No description</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
                    <span>Updated {formatDateTime(t.updatedAt)}</span>
                    <Link
                      href={`/templates/${t.id}`}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Open designer
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              illustration={<TemplatesBlueprint />}
              title="No templates yet"
              description="Start from a standard business-check blueprint or a blank canvas."
              action={
                <Button onClick={() => setShowCreate(true)} iconLeft={<Plus className="size-4" />}>
                  New template
                </Button>
              }
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function CreateTemplateForm({
  onClose,
  mutateList,
}: {
  onClose: () => void;
  mutateList: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const accounts = useApi<PaginatedDTO<BankAccountDTO>>('/api/v1/bank-accounts');

  const [name, setName] = useState('Secure Business Check');
  const [description, setDescription] = useState('');
  const [stockId, setStockId] = useState<StockId>('business-3up');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [seedKind, setSeedKind] = useState<'security' | 'standard' | 'blank'>('security');
  const [error, setError] = useState<string | null>(null);

  const create = useApiMutation<CreateTemplateInput, TemplateDTO>(
    () => '/api/v1/templates',
    { method: 'POST', body: (input) => input },
  );

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    if (!name.trim()) return setError('Name is required.');
    const document =
      seedKind === 'security'
        ? buildSecurityDocument(stockId)
        : seedKind === 'blank'
          ? buildBlankDocument(stockId)
          : buildBlueprintDocument(stockId);
    try {
      const created = await create.trigger({
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(bankAccountId ? { bankAccountId } : {}),
        document,
      });
      toast.success('Template created');
      mutateList();
      onClose();
      router.push(`/templates/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create template');
    }
  };

  return (
    <Card>
      <CardHeader
        title="New template"
        description="Pick a starting point — you can edit the layout afterward in the designer."
        actions={
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
            <X className="size-4" />
          </button>
        }
      />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="tpl-name"
            label="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            id="tpl-bank"
            label="Bank account (optional)"
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            description={accounts.isLoading ? 'Loading…' : 'Used to populate MICR routing/account.'}
          >
            <option value="">— None —</option>
            {accounts.data?.items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nickname} · {a.bankName}
              </option>
            ))}
          </Select>
        </div>
        <Input
          id="tpl-description"
          label="Description"
          placeholder="What this template is used for"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Check stock</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {StockOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStockId(opt.id)}
                className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                  stockId === opt.id
                    ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/40'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                <span className="mt-0.5 text-xs text-gray-500">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Starting layout</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setSeedKind('security')}
              className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                seedKind === 'security'
                  ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/40'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                Security check
                <Badge tone="green">Recommended</Badge>
              </span>
              <span className="mt-0.5 text-xs text-gray-500">
                Full ANSI X9.100 / CPSA suite — microprint, pantograph, padlock legend, stale-date,
                amount protection.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSeedKind('standard')}
              className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                seedKind === 'standard'
                  ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/40'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-medium text-gray-900">Standard business check</span>
              <span className="mt-0.5 text-xs text-gray-500">
                ANSI X9.100 compliant — payee, amount box, MICR line, signature.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSeedKind('blank')}
              className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                seedKind === 'blank'
                  ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/40'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-medium text-gray-900">Blank canvas</span>
              <span className="mt-0.5 text-xs text-gray-500">
                Empty stock — add objects manually in the designer.
              </span>
            </button>
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
          <Button type="button" onClick={handleSubmit} isLoading={create.isMutating}>
            Create &amp; open designer
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
