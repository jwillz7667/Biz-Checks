'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { LabelField } from '@/lib/api/types';

import { Button } from '@/components/ui/button';
import { useDesignerStore } from '@/lib/designer/store';


export function LabelFieldsEditor(): React.JSX.Element {
  const document = useDesignerStore((s) => s.document);
  const upsert = useDesignerStore((s) => s.upsertLabelField);
  const remove = useDesignerStore((s) => s.removeLabelField);
  const [draftName, setDraftName] = useState('');
  const [draftKind, setDraftKind] = useState<'constant' | 'incrementing'>('constant');

  if (!document) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  const handleAdd = (): void => {
    const name = draftName.trim();
    if (!name) return;
    if (document.labelFields.some((f) => f.name === name)) return;
    const field: LabelField =
      draftKind === 'constant'
        ? { kind: 'constant', name, value: '' }
        : { kind: 'incrementing', name, next: 1, step: 1, pad: 0 };
    upsert(field);
    setDraftName('');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {document.labelFields.length === 0 ? (
          <p className="text-xs text-gray-500">
            Label fields are runtime variables that templates reference (e.g. Payee, Amount,
            SerialNumber). Per-row values come from a CSV or batch payload.
          </p>
        ) : null}
        <div className="space-y-1.5">
          {document.labelFields.map((f) => (
            <FieldRow key={f.name} field={f} onChange={(next) => upsert(next, f.name)} onDelete={() => remove(f.name)} />
          ))}
        </div>
      </div>
      <div className="rounded-md border border-dashed border-gray-300 bg-gray-50/60 p-2">
        <div className="grid grid-cols-[1fr,140px,auto] items-end gap-2">
          <label className="space-y-1 text-[11px] font-medium text-gray-600">
            <span>New field name</span>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. CustomLine"
              className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
            />
          </label>
          <label className="space-y-1 text-[11px] font-medium text-gray-600">
            <span>Kind</span>
            <select
              value={draftKind}
              onChange={(e) => setDraftKind(e.target.value as 'constant' | 'incrementing')}
              className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              <option value="constant">Constant</option>
              <option value="incrementing">Incrementing</option>
            </select>
          </label>
          <Button size="sm" iconLeft={<Plus className="size-3.5" />} onClick={handleAdd}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  onChange,
  onDelete,
}: {
  field: LabelField;
  onChange: (next: LabelField) => void;
  onDelete: () => void;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-[120px,90px,1fr,auto] items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5">
      <input
        type="text"
        value={field.name}
        onChange={(e) => onChange({ ...field, name: e.target.value })}
        className="block w-full rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-mono"
      />
      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-center text-[10px] font-medium uppercase tracking-wider text-gray-700">
        {field.kind}
      </span>
      {field.kind === 'constant' ? (
        <input
          type="text"
          value={field.value}
          onChange={(e) => onChange({ ...field, value: e.target.value })}
          placeholder="Default value"
          className="block w-full rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs"
        />
      ) : (
        <div className="grid grid-cols-3 gap-1">
          <NumInput
            label="next"
            value={field.next}
            onChange={(v) => onChange({ ...field, next: Math.max(0, v) })}
          />
          <NumInput
            label="step"
            value={field.step}
            onChange={(v) => onChange({ ...field, step: Math.max(1, v) })}
          />
          <NumInput
            label="pad"
            value={field.pad}
            onChange={(v) => onChange({ ...field, pad: Math.max(0, Math.min(20, v)) })}
          />
        </div>
      )}
      <button
        type="button"
        onClick={onDelete}
        title="Delete field"
        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <label className="flex items-center gap-1 text-[10px] text-gray-500">
      <span className="font-mono">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="block w-full rounded border border-gray-200 bg-white px-1 py-0.5 text-[11px] font-mono tabular-nums"
      />
    </label>
  );
}
