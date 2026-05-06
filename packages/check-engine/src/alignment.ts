import { unionRect } from './geometry.js';

import type { CanvasObject, Position } from '@biz-checks/domain';


export type Alignment =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom'
  | 'distribute-h'
  | 'distribute-v';

/**
 * Align/distribute objects relative to the bounding box of the selection.
 * Distribution requires at least three objects; with fewer it is a no-op.
 *
 * Returns a new array of objects with updated positions; original input
 * is not mutated.
 */
export function alignObjects<T extends CanvasObject>(objects: readonly T[], alignment: Alignment): T[] {
  if (objects.length < 2) return objects.slice();
  const bbox = unionRect(objects.map((o) => ({ x: o.position.x, y: o.position.y, ...o.size })));
  if (!bbox) return objects.slice();

  switch (alignment) {
    case 'left':
      return objects.map((o) => withPosition(o, { x: bbox.x, y: o.position.y }));
    case 'right':
      return objects.map((o) =>
        withPosition(o, { x: bbox.x + bbox.width - o.size.width, y: o.position.y }),
      );
    case 'center-h':
      return objects.map((o) =>
        withPosition(o, {
          x: bbox.x + (bbox.width - o.size.width) / 2,
          y: o.position.y,
        }),
      );
    case 'top':
      return objects.map((o) => withPosition(o, { x: o.position.x, y: bbox.y }));
    case 'bottom':
      return objects.map((o) =>
        withPosition(o, { x: o.position.x, y: bbox.y + bbox.height - o.size.height }),
      );
    case 'center-v':
      return objects.map((o) =>
        withPosition(o, {
          x: o.position.x,
          y: bbox.y + (bbox.height - o.size.height) / 2,
        }),
      );
    case 'distribute-h': {
      if (objects.length < 3) return objects.slice();
      const sorted = [...objects].sort((a, b) => a.position.x - b.position.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (!first || !last) return objects.slice();
      const totalWidth = sorted.reduce((s, o) => s + o.size.width, 0);
      const span = last.position.x + last.size.width - first.position.x;
      const gap = (span - totalWidth) / (sorted.length - 1);
      let cursor = first.position.x;
      const newPositions = new Map<string, Position>();
      for (const o of sorted) {
        newPositions.set(o.id, { x: cursor, y: o.position.y });
        cursor += o.size.width + gap;
      }
      return objects.map((o) => withPosition(o, newPositions.get(o.id) ?? o.position));
    }
    case 'distribute-v': {
      if (objects.length < 3) return objects.slice();
      const sorted = [...objects].sort((a, b) => a.position.y - b.position.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (!first || !last) return objects.slice();
      const totalHeight = sorted.reduce((s, o) => s + o.size.height, 0);
      const span = last.position.y + last.size.height - first.position.y;
      const gap = (span - totalHeight) / (sorted.length - 1);
      let cursor = first.position.y;
      const newPositions = new Map<string, Position>();
      for (const o of sorted) {
        newPositions.set(o.id, { x: o.position.x, y: cursor });
        cursor += o.size.height + gap;
      }
      return objects.map((o) => withPosition(o, newPositions.get(o.id) ?? o.position));
    }
  }
}

/** Z-order helpers — operates on a (mutable copy of) the objects array. */
export function bringForward<T extends CanvasObject>(objects: readonly T[], id: string): T[] {
  const arr = [...objects].sort((a, b) => a.zIndex - b.zIndex);
  const idx = arr.findIndex((o) => o.id === id);
  if (idx < 0 || idx === arr.length - 1) return [...objects];
  const cur = arr[idx];
  const next = arr[idx + 1];
  if (!cur || !next) return [...objects];
  const swappedZ = next.zIndex;
  return objects.map((o) => {
    if (o.id === cur.id) return { ...o, zIndex: swappedZ };
    if (o.id === next.id) return { ...o, zIndex: cur.zIndex };
    return o;
  });
}

export function sendBackward<T extends CanvasObject>(objects: readonly T[], id: string): T[] {
  const arr = [...objects].sort((a, b) => a.zIndex - b.zIndex);
  const idx = arr.findIndex((o) => o.id === id);
  if (idx <= 0) return [...objects];
  const cur = arr[idx];
  const prev = arr[idx - 1];
  if (!cur || !prev) return [...objects];
  const swappedZ = prev.zIndex;
  return objects.map((o) => {
    if (o.id === cur.id) return { ...o, zIndex: swappedZ };
    if (o.id === prev.id) return { ...o, zIndex: cur.zIndex };
    return o;
  });
}

export function bringToFront<T extends CanvasObject>(objects: readonly T[], id: string): T[] {
  const max = objects.reduce((m, o) => (o.zIndex > m ? o.zIndex : m), 0);
  return objects.map((o) => (o.id === id ? { ...o, zIndex: max + 1 } : o));
}

export function sendToBack<T extends CanvasObject>(objects: readonly T[], id: string): T[] {
  const min = objects.reduce((m, o) => (o.zIndex < m ? o.zIndex : m), 0);
  return objects.map((o) => (o.id === id ? { ...o, zIndex: min - 1 } : o));
}

function withPosition<T extends CanvasObject>(o: T, position: Position): T {
  return { ...o, position };
}
