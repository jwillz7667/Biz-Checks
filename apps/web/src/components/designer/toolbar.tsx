'use client';

import {
  AlignCenterVertical,
  Grid3x3,
  Image as ImageIcon,
  PenLine,
  PenSquare,
  Plus,
  Square,
  Type as TypeIcon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { useDesignerStore } from '@/lib/designer/store';

import type { CanvasObjectKind } from '@/lib/api/types';

const ADD_BUTTONS: Array<{ kind: CanvasObjectKind; label: string; icon: React.ReactNode }> = [
  { kind: 'text', label: 'Text', icon: <TypeIcon className="size-4" /> },
  { kind: 'micr', label: 'MICR', icon: <PenLine className="size-4" /> },
  { kind: 'amount-box', label: 'Amount', icon: <Square className="size-4" /> },
  { kind: 'shape', label: 'Shape', icon: <Square className="size-4" /> },
  { kind: 'image', label: 'Image', icon: <ImageIcon className="size-4" /> },
  { kind: 'signature', label: 'Sign', icon: <PenSquare className="size-4" /> },
];

export function DesignerToolbar(): React.JSX.Element {
  const addObject = useDesignerStore((s) => s.addObject);
  const zoom = useDesignerStore((s) => s.zoom);
  const setZoom = useDesignerStore((s) => s.setZoom);
  const snapToGrid = useDesignerStore((s) => s.snapToGrid);
  const toggleSnap = useDesignerStore((s) => s.toggleSnap);
  const showGuides = useDesignerStore((s) => s.showGuides);
  const toggleGuides = useDesignerStore((s) => s.toggleGuides);

  return (
    <div className="flex items-center gap-1 border-t border-gray-200 bg-white px-3 py-1.5">
      <div className="flex items-center gap-1 pr-3">
        <Plus className="mr-1 size-3.5 text-gray-400" />
        {ADD_BUTTONS.map((b) => (
          <button
            key={b.kind}
            type="button"
            onClick={() => addObject(b.kind)}
            className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
            title={`Add ${b.label}`}
          >
            {b.icon}
            <span>{b.label}</span>
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1 border-l border-gray-200 pl-3">
        <button
          type="button"
          onClick={toggleSnap}
          className={`flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
            snapToGrid ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Snap to grid"
        >
          <Grid3x3 className="size-3.5" />
          <span>Snap</span>
        </button>
        <button
          type="button"
          onClick={toggleGuides}
          className={`flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
            showGuides ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Toggle guides"
        >
          <AlignCenterVertical className="size-3.5" />
          <span>Guides</span>
        </button>

        <div className="ml-2 flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1">
          <button
            type="button"
            onClick={() => setZoom(zoom - 0.1)}
            className="rounded p-1 text-gray-600 hover:bg-gray-100"
            title="Zoom out"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="min-w-[48px] text-center font-mono text-[11px] text-gray-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(zoom + 0.1)}
            className="rounded p-1 text-gray-600 hover:bg-gray-100"
            title="Zoom in"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="ml-1 rounded px-1 text-[10px] font-medium text-gray-500 hover:bg-gray-100"
            title="Reset zoom"
          >
            100%
          </button>
        </div>
      </div>
    </div>
  );
}
