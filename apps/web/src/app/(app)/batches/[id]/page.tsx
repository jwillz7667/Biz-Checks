'use client';

import { ArrowLeft, Download, Loader2, Printer, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ApiError } from '@/lib/api/client';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/auth-provider';
import type { CheckBatchDTO, CheckBatchStatus } from '@/lib/api/types';
import { formatDateTime, formatMinor } from '@/lib/format';
import { useToast } from '@/lib/ui/toast';

const STATUS_TONES: Record<CheckBatchStatus, BadgeTone> = {
  DRAFT: 'gray',
  RENDERING: 'blue',
  RENDERED: 'purple',
  PRINTED: 'green',
  FAILED: 'red',
};

export default function BatchDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const batchId = params.id;
  const toast = useToast();
  const { api } = useAuth();

  const batch = useApi<CheckBatchDTO>(batchId ? `/api/v1/check-batches/${batchId}` : null, undefined, {
    refreshInterval: (data) =>
      !data || data.status === 'RENDERING' || data.status === 'DRAFT' ? 2_000 : 0,
  });

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isFetchingPdf, setIsFetchingPdf] = useState(false);

  const fetchPdf = async (): Promise<void> => {
    if (!batchId) return;
    setIsFetchingPdf(true);
    try {
      const blob = await api.request<Blob>(`/api/v1/check-batches/${batchId}/pdf`, { asBlob: true });
      const url = URL.createObjectURL(blob);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      toast.error('Could not load PDF', err instanceof ApiError ? err.message : undefined);
    } finally {
      setIsFetchingPdf(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Auto-fetch PDF once the batch is rendered.
  useEffect(() => {
    if (batch.data?.status === 'RENDERED' || batch.data?.status === 'PRINTED') {
      if (!pdfUrl && !isFetchingPdf) void fetchPdf();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.data?.status]);

  const print = useApiMutation<void, CheckBatchDTO>(
    () => `/api/v1/check-batches/${batchId}/print`,
    { method: 'POST' },
  );

  const handleMarkPrinted = async (): Promise<void> => {
    try {
      const updated = await print.trigger();
      void batch.mutate(updated, { revalidate: false });
      toast.success('Marked as printed');
    } catch (err) {
      toast.error('Could not mark printed', err instanceof ApiError ? err.message : undefined);
    }
  };

  if (batch.isLoading || !batch.data) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-500">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading batch…
      </div>
    );
  }

  const b = batch.data;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/batches"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            title="Back to batches"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{b.name}</h1>
              <Badge tone={STATUS_TONES[b.status]}>{b.status}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {b.count} checks · {formatMinor(b.totalAmountMinor, b.currency)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void batch.mutate()}
            iconLeft={<RefreshCw className="size-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPdf}
            iconLeft={<Download className="size-3.5" />}
            isLoading={isFetchingPdf}
            disabled={b.status !== 'RENDERED' && b.status !== 'PRINTED'}
          >
            Download PDF
          </Button>
          <Button
            size="sm"
            onClick={handleMarkPrinted}
            iconLeft={<Printer className="size-3.5" />}
            isLoading={print.isMutating}
            disabled={b.status !== 'RENDERED'}
          >
            Mark printed
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Status" value={b.status} />
        <Stat label="Count" value={String(b.count)} />
        <Stat label="Total" value={formatMinor(b.totalAmountMinor, b.currency)} />
        <Stat label="Created" value={formatDateTime(b.createdAt)} />
      </div>

      <Card>
        <CardHeader
          title="Rendered PDF"
          description={
            b.status === 'RENDERED' || b.status === 'PRINTED'
              ? `${b.count} checks, ${b.currency}, checksum ${b.pdfChecksum?.slice(0, 12) ?? '—'}…`
              : 'PDF will appear once rendering completes.'
          }
        />
        <CardBody className="p-0">
          {b.status === 'FAILED' ? (
            <div className="space-y-2 p-6">
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                Render failed: {b.errorMessage ?? 'Unknown error.'}
              </div>
              <p className="text-xs text-gray-500">
                Re-create the batch to retry. The original idempotency key cannot be reused.
              </p>
            </div>
          ) : pdfUrl ? (
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              title={`Batch ${b.name}`}
              className="block h-[70vh] w-full border-0 bg-gray-100"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-16 text-sm text-gray-500">
              {b.status === 'RENDERING' || b.status === 'DRAFT' ? (
                <>
                  <Loader2 className="size-5 animate-spin text-gray-400" />
                  <span>Rendering PDF…</span>
                </>
              ) : (
                <>
                  <span>PDF not loaded.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchPdf}
                    iconLeft={<Download className="size-3.5" />}
                    isLoading={isFetchingPdf}
                  >
                    Load PDF
                  </Button>
                </>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
        <div className="mt-1.5 truncate text-base font-semibold text-gray-900">{value}</div>
      </CardBody>
    </Card>
  );
}
