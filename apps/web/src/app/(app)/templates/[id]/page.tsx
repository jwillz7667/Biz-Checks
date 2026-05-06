'use client';

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { TemplateDTO, UpdateTemplateInput } from '@/lib/api/types';

import { LabelFieldsEditor } from '@/components/designer/label-fields-editor';
import { LayersPanel } from '@/components/designer/layers-panel';
import { PropertiesPanel } from '@/components/designer/properties-panel';
import { DesignerToolbar } from '@/components/designer/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import { useDesignerStore } from '@/lib/designer/store';
import { useToast } from '@/lib/ui/toast';

const DesignerCanvas = dynamic(
  () => import('@/components/designer/canvas').then((m) => m.DesignerCanvas),
  { ssr: false, loading: () => <CanvasFallback /> },
);

export default function TemplateDesignerPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = params.id;
  const toast = useToast();

  const tplKey = templateId ? `/api/v1/templates/${templateId}` : null;
  const tpl = useApi<TemplateDTO>(tplKey);

  const document = useDesignerStore((s) => s.document);
  const isHydrated = useDesignerStore((s) => s.isHydrated);
  const isDirty = useDesignerStore((s) => s.isDirty);
  const hydrate = useDesignerStore((s) => s.hydrate);
  const markSaved = useDesignerStore((s) => s.markSaved);

  const [showFieldsPanel, setShowFieldsPanel] = useState(false);

  useEffect(() => {
    if (tpl.data && !isHydrated) hydrate(tpl.data.document);
  }, [tpl.data, isHydrated, hydrate]);

  // Re-hydrate when navigating to a different template id.
  const lastIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (tpl.data && tpl.data.id !== lastIdRef.current) {
      lastIdRef.current = tpl.data.id;
      hydrate(tpl.data.document);
    }
  }, [tpl.data, hydrate]);

  const save = useApiMutation<UpdateTemplateInput, TemplateDTO>(
    () => `/api/v1/templates/${templateId}`,
    { method: 'PATCH', body: (input) => input },
  );

  const publish = useApiMutation<void, TemplateDTO>(
    () => `/api/v1/templates/${templateId}/publish`,
    { method: 'POST' },
  );

  const archive = useApiMutation<void, void>(
    () => `/api/v1/templates/${templateId}`,
    { method: 'DELETE' },
  );

  const handleSave = async (): Promise<void> => {
    if (!document) return;
    try {
      const updated = await save.trigger({ document });
      markSaved();
      void tpl.mutate(updated, { revalidate: false });
      toast.success('Template saved', `Version ${updated.version}`);
    } catch (err) {
      toast.error('Could not save', err instanceof ApiError ? err.message : undefined);
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (isDirty) {
      toast.info('Save your changes first');
      return;
    }
    try {
      const updated = await publish.trigger();
      void tpl.mutate(updated, { revalidate: false });
      toast.success('Template published');
    } catch (err) {
      toast.error('Could not publish', err instanceof ApiError ? err.message : undefined);
    }
  };

  const handleArchive = async (): Promise<void> => {
    if (!confirm('Archive this template? It will be hidden from new batches.')) return;
    try {
      await archive.trigger();
      toast.success('Template archived');
      router.push('/templates');
    } catch (err) {
      toast.error('Could not archive', err instanceof ApiError ? err.message : undefined);
    }
  };

  if (tpl.isLoading || !tpl.data) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center text-sm text-gray-500">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading template…
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-6 flex h-[calc(100vh-3.6rem)] flex-col bg-white">
      <DesignerHeader
        template={tpl.data}
        isDirty={isDirty}
        isSaving={save.isMutating}
        isPublishing={publish.isMutating}
        isArchiving={archive.isMutating}
        showFieldsPanel={showFieldsPanel}
        onToggleFieldsPanel={() => setShowFieldsPanel((v) => !v)}
        onSave={handleSave}
        onPublish={handlePublish}
        onArchive={handleArchive}
      />

      {showFieldsPanel ? (
        <div className="border-b border-gray-200 bg-gray-50/60 px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Label fields
            </h3>
            <span className="text-[11px] text-gray-500">
              Used in objects via L#(&quot;Name&quot;) or label-field references.
            </span>
          </div>
          <LabelFieldsEditor />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
          <LayersPanel />
        </aside>
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <CanvasContainer>
              {(w, h) => <DesignerCanvas width={w} height={h} />}
            </CanvasContainer>
          </div>
          <DesignerToolbar />
        </main>
        <aside className="w-72 shrink-0 border-l border-gray-200 bg-white">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}

function DesignerHeader({
  template,
  isDirty,
  isSaving,
  isPublishing,
  isArchiving,
  showFieldsPanel,
  onToggleFieldsPanel,
  onSave,
  onPublish,
  onArchive,
}: {
  template: TemplateDTO;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isArchiving: boolean;
  showFieldsPanel: boolean;
  onToggleFieldsPanel: () => void;
  onSave: () => void;
  onPublish: () => void;
  onArchive: () => void;
}): React.JSX.Element {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/templates"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          title="Back to templates"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-gray-900">{template.name}</h1>
            <Badge tone={template.isPublished ? 'green' : 'gray'}>
              {template.isPublished ? 'Published' : 'Draft'}
            </Badge>
            <Badge tone="blue">v{template.version}</Badge>
            {isDirty ? <Badge tone="yellow">Unsaved changes</Badge> : null}
          </div>
          {template.description ? (
            <p className="mt-0.5 truncate text-xs text-gray-500">{template.description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={showFieldsPanel ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleFieldsPanel}
          iconLeft={<Settings2 className="size-3.5" />}
        >
          Fields
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onArchive}
          iconLeft={<Trash2 className="size-3.5" />}
          isLoading={isArchiving}
        >
          Archive
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPublish}
          iconLeft={<ShieldCheck className="size-3.5" />}
          isLoading={isPublishing}
          disabled={template.isPublished}
        >
          {template.isPublished ? 'Published' : 'Publish'}
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          iconLeft={isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          isLoading={isSaving}
          disabled={!isDirty}
        >
          {isDirty ? 'Save' : 'Saved'}
        </Button>
      </div>
    </div>
  );
}

function CanvasContainer({
  children,
}: {
  children: (width: number, height: number) => React.ReactNode;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        const h = Math.floor(e.contentRect.height);
        setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {size.w > 0 && size.h > 0 ? children(size.w, size.h) : <CanvasFallback />}
    </div>
  );
}

function CanvasFallback(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      <CheckCircle2 className="mr-2 size-4 animate-pulse text-gray-300" />
      Loading canvas…
    </div>
  );
}
