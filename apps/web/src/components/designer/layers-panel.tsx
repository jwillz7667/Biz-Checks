'use client';

import {
  ChevronsDown,
  ChevronsUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Trash2,
} from 'lucide-react';

import { KIND_LABEL, useDesignerStore } from '@/lib/designer/store';

import type { CanvasObject } from '@/lib/api/types';

export function LayersPanel(): React.JSX.Element {
  const document = useDesignerStore((s) => s.document);
  const selectedId = useDesignerStore((s) => s.selectedId);
  const selectObject = useDesignerStore((s) => s.selectObject);
  const updateObject = useDesignerStore((s) => s.updateObject);
  const deleteObject = useDesignerStore((s) => s.deleteObject);
  const duplicateObject = useDesignerStore((s) => s.duplicateObject);
  const moveZ = useDesignerStore((s) => s.moveZ);

  if (!document) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  const ordered = [...document.objects].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-gray-200 px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Layers</span>
        <span className="text-xs text-gray-400">{document.objects.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto thin-scroll">
        {ordered.length === 0 ? (
          <p className="p-4 text-xs text-gray-500">No objects yet. Use the toolbar to add one.</p>
        ) : (
          <ul>
            {ordered.map((obj) => {
              const selected = obj.id === selectedId;
              return (
                <li key={obj.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => selectObject(obj.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') selectObject(obj.id);
                    }}
                    className={`group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs ${
                      selected ? 'bg-brand-50 text-brand-900' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-12 shrink-0 items-center justify-center rounded text-[10px] font-medium uppercase tracking-wider ${
                        selected ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {KIND_LABEL[obj.kind]}
                    </span>
                    <span className="flex-1 truncate">{obj.name}</span>
                    <ToggleIcon
                      active={obj.visible}
                      on={<Eye className="size-3.5" />}
                      off={<EyeOff className="size-3.5" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateObject(obj.id, (o) => ({ ...o, visible: !o.visible }) as CanvasObject);
                      }}
                      title="Toggle visibility"
                    />
                    <ToggleIcon
                      active={!obj.locked}
                      on={<LockOpen className="size-3.5" />}
                      off={<Lock className="size-3.5" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateObject(obj.id, (o) => ({ ...o, locked: !o.locked }) as CanvasObject);
                      }}
                      title="Toggle lock"
                    />
                  </div>
                  {selected ? (
                    <div className="flex items-center gap-1 border-y border-brand-100 bg-brand-50/50 px-3 py-1">
                      <RowAction
                        icon={<ChevronsUp className="size-3" />}
                        label="Bring forward"
                        onClick={() => moveZ(obj.id, 'up')}
                      />
                      <RowAction
                        icon={<ChevronsDown className="size-3" />}
                        label="Send back"
                        onClick={() => moveZ(obj.id, 'down')}
                      />
                      <span className="mx-1 h-3 w-px bg-brand-200" />
                      <RowAction
                        icon={<Copy className="size-3" />}
                        label="Duplicate"
                        onClick={() => duplicateObject(obj.id)}
                      />
                      <RowAction
                        icon={<Trash2 className="size-3" />}
                        label="Delete"
                        onClick={() => deleteObject(obj.id)}
                        danger
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ToggleIcon({
  active,
  on,
  off,
  onClick,
  title,
}: {
  active: boolean;
  on: React.ReactNode;
  off: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1 transition-colors ${
        active ? 'text-gray-500 hover:bg-gray-200' : 'text-gray-400 hover:bg-gray-200'
      }`}
    >
      {active ? on : off}
    </button>
  );
}

function RowAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
        danger
          ? 'text-red-700 hover:bg-red-100'
          : 'text-brand-800 hover:bg-brand-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
