'use client';

import { randomCanvasObjectId } from '@biz-checks/domain';
import { create } from 'zustand';

import type {
  AmountBoxObject,
  CanvasObject,
  CanvasObjectKind,
  ImageObject,
  LabelField,
  MICRObject,
  SecurityPattern,
  ShapeObject,
  SignatureObject,
  TemplateDocument,
  TextObject,
  ValueExpression,
} from '@/lib/api/types';

const POINTS_PER_INCH = 72;
const inch = (n: number): number => n * POINTS_PER_INCH;

export interface DesignerState {
  /** The authoritative working document. Mutations replace this immutably. */
  document: TemplateDocument | null;
  /** Set after first hydrate from the server payload. */
  isHydrated: boolean;
  /** True if the working document differs from the last saved snapshot. */
  isDirty: boolean;
  selectedId: string | null;
  zoom: number;
  snapToGrid: boolean;
  gridSizePt: number;
  showGuides: boolean;
  /** Last persisted snapshot used to compute `isDirty`. */
  savedSnapshot: string | null;

  // Property-syntax (not method-shorthand) so destructured selectors don't
  // trigger `@typescript-eslint/unbound-method`. Zustand actions are pure
  // functions, not bound methods.
  hydrate: (document: TemplateDocument) => void;
  markSaved: () => void;

  setZoom: (zoom: number) => void;
  toggleSnap: () => void;
  setSnap: (snap: boolean) => void;
  setGridSize: (size: number) => void;
  toggleGuides: () => void;

  selectObject: (id: string | null) => void;

  addObject: (kind: CanvasObjectKind) => void;
  updateObject: (id: string, patch: (obj: CanvasObject) => CanvasObject) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  moveZ: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;

  setBackground: (color: string) => void;
  setSecurityPattern: (pattern: SecurityPattern) => void;
  upsertLabelField: (field: LabelField, originalName?: string) => void;
  removeLabelField: (name: string) => void;
}

function snapshot(doc: TemplateDocument | null): string | null {
  return doc ? JSON.stringify(doc) : null;
}

function defaultsForKind(kind: CanvasObjectKind, zIndex: number): CanvasObject {
  const id = randomCanvasObjectId();
  const base = {
    id,
    rotation: 0,
    locked: false,
    visible: true,
    zIndex,
  } as const;
  switch (kind) {
    case 'text': {
      const o: TextObject = {
        ...base,
        kind: 'text',
        name: 'Text',
        position: { x: inch(0.5), y: inch(0.5) },
        size: { width: inch(2.5), height: inch(0.3) },
        value: { kind: 'literal', text: 'New text' },
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: 'regular',
        italic: false,
        underline: false,
        color: '#000000',
        justification: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
      };
      return o;
    }
    case 'micr': {
      const o: MICRObject = {
        ...base,
        kind: 'micr',
        name: 'MICR Line',
        position: { x: inch(0.5), y: inch(3.05) },
        size: { width: inch(7.5), height: inch(0.3) },
        value: { kind: 'literal', text: '⑈ 123456789 ⑈ 0123456789 ⑈' },
        fontVariant: 'e13b',
        fontSize: 12,
        color: '#000000',
        justification: 'left',
      };
      return o;
    }
    case 'amount-box': {
      const o: AmountBoxObject = {
        ...base,
        kind: 'amount-box',
        name: 'Amount Box',
        position: { x: inch(6.4), y: inch(1.4) },
        size: { width: inch(1.7), height: inch(0.35) },
        value: { kind: 'label-field', field: 'Amount' },
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000000',
        justification: 'right',
        securityFont: 'amount-protect',
        showCurrencySymbol: true,
      };
      return o;
    }
    case 'shape': {
      const o: ShapeObject = {
        ...base,
        kind: 'shape',
        name: 'Rectangle',
        position: { x: inch(1), y: inch(1) },
        size: { width: inch(1), height: inch(0.5) },
        shape: 'rectangle',
        strokeColor: '#000000',
        strokeWidth: 1,
        cornerRadius: 0,
      };
      return o;
    }
    case 'image': {
      const o: ImageObject = {
        ...base,
        kind: 'image',
        name: 'Image',
        position: { x: inch(0.5), y: inch(0.5) },
        size: { width: inch(1.5), height: inch(0.75) },
        url: 'https://placehold.co/200x100',
        fitMode: 'contain',
      };
      return o;
    }
    case 'signature': {
      const o: SignatureObject = {
        ...base,
        kind: 'signature',
        name: 'Signature',
        position: { x: inch(5.0), y: inch(2.5) },
        size: { width: inch(3.0), height: inch(0.5) },
        fitMode: 'contain',
        signerName: 'Authorized Signature',
        fontFamily: 'caveat',
        fontSize: 28,
        color: '#1a1a2e',
      };
      return o;
    }
  }
}

export const useDesignerStore = create<DesignerState>((set, get) => ({
  document: null,
  isHydrated: false,
  isDirty: false,
  selectedId: null,
  zoom: 1,
  snapToGrid: true,
  gridSizePt: POINTS_PER_INCH / 8,
  showGuides: true,
  savedSnapshot: null,

  hydrate(document) {
    set({
      document,
      isHydrated: true,
      isDirty: false,
      savedSnapshot: snapshot(document),
      selectedId: null,
    });
  },

  markSaved() {
    const doc = get().document;
    set({ savedSnapshot: snapshot(doc), isDirty: false });
  },

  setZoom(zoom) {
    set({ zoom: clamp(zoom, 0.25, 4) });
  },
  toggleSnap() {
    set({ snapToGrid: !get().snapToGrid });
  },
  setSnap(snap) {
    set({ snapToGrid: snap });
  },
  setGridSize(size) {
    set({ gridSizePt: Math.max(1, size) });
  },
  toggleGuides() {
    set({ showGuides: !get().showGuides });
  },

  selectObject(id) {
    set({ selectedId: id });
  },

  addObject(kind) {
    const doc = get().document;
    if (!doc) return;
    const maxZ = doc.objects.reduce((m, o) => Math.max(m, o.zIndex), 0);
    const obj = defaultsForKind(kind, maxZ + 1);
    const next: TemplateDocument = { ...doc, objects: [...doc.objects, obj] };
    set({ document: next, selectedId: obj.id, isDirty: snapshot(next) !== get().savedSnapshot });
  },

  updateObject(id, patch) {
    const doc = get().document;
    if (!doc) return;
    const objects = doc.objects.map((o) => (o.id === id ? patch(o) : o));
    const next: TemplateDocument = { ...doc, objects };
    set({ document: next, isDirty: snapshot(next) !== get().savedSnapshot });
  },

  deleteObject(id) {
    const doc = get().document;
    if (!doc) return;
    const next: TemplateDocument = {
      ...doc,
      objects: doc.objects.filter((o) => o.id !== id),
    };
    set({
      document: next,
      selectedId: get().selectedId === id ? null : get().selectedId,
      isDirty: snapshot(next) !== get().savedSnapshot,
    });
  },

  duplicateObject(id) {
    const doc = get().document;
    if (!doc) return;
    const orig = doc.objects.find((o) => o.id === id);
    if (!orig) return;
    const maxZ = doc.objects.reduce((m, o) => Math.max(m, o.zIndex), 0);
    const copy: CanvasObject = {
      ...orig,
      id: randomCanvasObjectId(),
      name: `${orig.name} copy`,
      position: {
        x: orig.position.x + POINTS_PER_INCH / 4,
        y: orig.position.y + POINTS_PER_INCH / 4,
      },
      zIndex: maxZ + 1,
    };
    const next: TemplateDocument = { ...doc, objects: [...doc.objects, copy] };
    set({ document: next, selectedId: copy.id, isDirty: snapshot(next) !== get().savedSnapshot });
  },

  moveZ(id, direction) {
    const doc = get().document;
    if (!doc) return;
    const sorted = [...doc.objects].sort((a, b) => a.zIndex - b.zIndex);
    const i = sorted.findIndex((o) => o.id === id);
    if (i < 0) return;

    let reordered = sorted;
    if (direction === 'up' && i < sorted.length - 1) {
      reordered = swap(sorted, i, i + 1);
    } else if (direction === 'down' && i > 0) {
      reordered = swap(sorted, i, i - 1);
    } else if (direction === 'top') {
      reordered = [...sorted.slice(0, i), ...sorted.slice(i + 1), sorted[i]!];
    } else if (direction === 'bottom') {
      reordered = [sorted[i]!, ...sorted.slice(0, i), ...sorted.slice(i + 1)];
    }
    const objects = reordered.map((o, idx) => ({ ...o, zIndex: idx + 1 }));
    const next: TemplateDocument = { ...doc, objects };
    set({ document: next, isDirty: snapshot(next) !== get().savedSnapshot });
  },

  setBackground(color) {
    const doc = get().document;
    if (!doc) return;
    const next: TemplateDocument = { ...doc, background: color };
    set({ document: next, isDirty: snapshot(next) !== get().savedSnapshot });
  },

  setSecurityPattern(pattern) {
    const doc = get().document;
    if (!doc) return;
    const next: TemplateDocument = { ...doc, securityPattern: pattern };
    set({ document: next, isDirty: snapshot(next) !== get().savedSnapshot });
  },

  upsertLabelField(field, originalName) {
    const doc = get().document;
    if (!doc) return;
    const matchName = originalName ?? field.name;
    const exists = doc.labelFields.some((f) => f.name === matchName);
    const labelFields = exists
      ? doc.labelFields.map((f) => (f.name === matchName ? field : f))
      : [...doc.labelFields, field];
    const next: TemplateDocument = { ...doc, labelFields };
    set({ document: next, isDirty: snapshot(next) !== get().savedSnapshot });
  },

  removeLabelField(name) {
    const doc = get().document;
    if (!doc) return;
    const next: TemplateDocument = {
      ...doc,
      labelFields: doc.labelFields.filter((f) => f.name !== name),
    };
    set({ document: next, isDirty: snapshot(next) !== get().savedSnapshot });
  },
}));

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function swap<T>(arr: readonly T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Helper utilities for components                                            */
/* ────────────────────────────────────────────────────────────────────────── */

export function describeValue(v: ValueExpression): string {
  switch (v.kind) {
    case 'literal':
      return v.text.length > 30 ? `${v.text.slice(0, 27)}…` : v.text;
    case 'formula':
      return `ƒ ${v.formula.length > 26 ? `${v.formula.slice(0, 23)}…` : v.formula}`;
    case 'label-field':
      return `L# ${v.field}`;
    case 'data-source':
      return `Field ${v.column}`;
  }
}

export const KIND_LABEL: Record<CanvasObjectKind, string> = {
  text: 'Text',
  micr: 'MICR',
  signature: 'Signature',
  image: 'Image',
  shape: 'Shape',
  'amount-box': 'Amount',
};
