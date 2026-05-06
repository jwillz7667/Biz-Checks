'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { BankAccountDTO, CreateBankAccountInput, PaginatedDTO } from '@/lib/api/types';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import { useToast } from '@/lib/ui/toast';

const Schema = z.object({
  nickname: z.string().min(1).max(120),
  bankName: z.string().min(1).max(200),
  routingNumber: z.string().regex(/^\d{9}$/, 'Routing must be 9 digits'),
  accountNumber: z.string().regex(/^\d{4,17}$/, 'Account 4-17 digits'),
  auxOnUs: z.string().regex(/^\d{0,15}$/).optional().or(z.literal('')),
  startingCheckNumber: z.coerce.number().int().min(1),
  fractionalRouting: z.string().max(20).optional().or(z.literal('')),
});
type FormData = z.infer<typeof Schema>;

export default function BankAccountsPage(): React.JSX.Element {
  const accounts = useApi<PaginatedDTO<BankAccountDTO>>('/api/v1/bank-accounts');
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Bank accounts</h1>
          <p className="text-sm text-gray-600">Manage routing and account numbers used for printing.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} iconLeft={<Plus className="size-4" />}>
          {showForm ? 'Cancel' : 'Add account'}
        </Button>
      </div>

      {showForm ? (
        <div className="mb-6">
          <CreateAccountForm onCreated={() => setShowForm(false)} mutateList={accounts.mutate} />
        </div>
      ) : null}

      <Card>
        <CardHeader title="All accounts" description={`${accounts.data?.total ?? 0} total`} />
        <CardBody className="p-0">
          {accounts.isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : accounts.data && accounts.data.items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-2 font-medium">Nickname</th>
                  <th className="px-5 py-2 font-medium">Bank</th>
                  <th className="px-5 py-2 font-medium">Routing</th>
                  <th className="px-5 py-2 font-medium">Account</th>
                  <th className="px-5 py-2 font-medium">Next check #</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.data.items.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">{a.nickname}</td>
                    <td className="px-5 py-3 text-gray-700">{a.bankName}</td>
                    <td className="px-5 py-3 font-mono tabular-nums text-gray-700">{a.routingNumber}</td>
                    <td className="px-5 py-3 font-mono tabular-nums text-gray-700">
                      ····{a.accountNumberLast4}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-gray-700">{a.nextCheckNumber}</td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          a.status === 'ACTIVE'
                            ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                            : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700'
                        }
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-sm text-gray-500">
              No accounts yet. Click <em>Add account</em> to set up your first one.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function CreateAccountForm({
  onCreated,
  mutateList,
}: {
  onCreated: () => void;
  mutateList: () => void;
}): React.JSX.Element {
  const toast = useToast();
  const create = useApiMutation<CreateBankAccountInput, BankAccountDTO>(
    () => '/api/v1/bank-accounts',
    { method: 'POST', body: (input) => input },
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { startingCheckNumber: 1001 },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      await create.trigger({
        nickname: data.nickname,
        bankName: data.bankName,
        routingNumber: data.routingNumber,
        accountNumber: data.accountNumber,
        ...(data.auxOnUs ? { auxOnUs: data.auxOnUs } : {}),
        startingCheckNumber: data.startingCheckNumber,
        ...(data.fractionalRouting ? { fractionalRouting: data.fractionalRouting } : {}),
      });
      toast.success('Bank account created');
      mutateList();
      onCreated();
    } catch (err) {
      toast.error('Could not create account', err instanceof ApiError ? err.message : undefined);
    }
  };

  return (
    <Card>
      <CardHeader
        title="New bank account"
        actions={
          <button onClick={onCreated} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
            <X className="size-4" />
          </button>
        }
      />
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="nickname"
            label="Nickname"
            error={errors.nickname?.message}
            {...register('nickname')}
          />
          <Input
            id="bankName"
            label="Bank name"
            error={errors.bankName?.message}
            {...register('bankName')}
          />
          <Input
            id="routingNumber"
            label="Routing number"
            description="9 digits, ABA-validated"
            error={errors.routingNumber?.message}
            {...register('routingNumber')}
          />
          <Input
            id="accountNumber"
            label="Account number"
            description="Encrypted at rest"
            error={errors.accountNumber?.message}
            {...register('accountNumber')}
          />
          <Input
            id="auxOnUs"
            label="Aux on-us (optional)"
            description="Up to 15 digits, leftmost MICR field"
            error={errors.auxOnUs?.message}
            {...register('auxOnUs')}
          />
          <Input
            id="startingCheckNumber"
            type="number"
            label="Starting check #"
            error={errors.startingCheckNumber?.message}
            {...register('startingCheckNumber')}
          />
          <Input
            id="fractionalRouting"
            label="Fractional routing (optional)"
            description="Displayed top-right, e.g. 11-1234/5678"
            error={errors.fractionalRouting?.message}
            {...register('fractionalRouting')}
          />
          <div className="col-span-full flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>
              Create account
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
