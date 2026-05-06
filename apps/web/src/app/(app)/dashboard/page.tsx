'use client';

import Link from 'next/link';

import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { useApi } from '@/lib/api/hooks';
import type {
  BankAccountDTO,
  CheckBatchDTO,
  PaginatedDTO,
  TemplateDTO,
} from '@/lib/api/types';

export default function DashboardPage(): React.JSX.Element {
  const accounts = useApi<PaginatedDTO<BankAccountDTO>>('/api/v1/bank-accounts');
  const templates = useApi<PaginatedDTO<TemplateDTO>>('/api/v1/templates');
  const batches = useApi<PaginatedDTO<CheckBatchDTO>>('/api/v1/check-batches', { limit: 5 });

  const stats: ReadonlyArray<{ label: string; value: string; href: string }> = [
    {
      label: 'Bank accounts',
      value: accounts.data?.total.toString() ?? '—',
      href: '/bank-accounts',
    },
    { label: 'Templates', value: templates.data?.total.toString() ?? '—', href: '/templates' },
    { label: 'Recent batches', value: batches.data?.total.toString() ?? '—', href: '/batches' },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
      <p className="mb-6 text-sm text-gray-600">
        Quick overview of your account, templates and recent batch activity.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href as never} className="block">
            <Card className="transition-shadow hover:shadow-md">
              <CardBody>
                <div className="text-xs uppercase tracking-wider text-gray-500">{s.label}</div>
                <div className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{s.value}</div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader title="Recent batches" description="Latest check batches in this organization" />
        <CardBody className="p-0">
          {batches.isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : batches.data && batches.data.items.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {batches.data.items.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <Link
                      href={`/batches/${b.id}` as never}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {b.name}
                    </Link>
                    <div className="text-xs text-gray-500">
                      {b.count} checks · {b.currency}{' '}
                      {(Number(b.totalAmountMinor) / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {b.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-sm text-gray-500">
              No batches yet. Create a template and a bank account, then start your first batch.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
