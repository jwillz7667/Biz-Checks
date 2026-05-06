import type { CanvasObject } from '@biz-checks/domain';
import type { Position, Rect, Size } from '@biz-checks/domain';

export function objectRect(obj: CanvasObject): Rect {
  return {
    x: obj.position.x,
    y: obj.position.y,
    width: obj.size.width,
    height: obj.size.height,
  };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

export function pointInRect(p: Position, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

export function unionRect(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.width > maxX) maxX = r.x + r.width;
    if (r.y + r.height > maxY) maxY = r.y + r.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function snapPositionToGrid(p: Position, gridSize: number): Position {
  return { x: snapToGrid(p.x, gridSize), y: snapToGrid(p.y, gridSize) };
}

export function clampSize(size: Size, min: Size, max: Size): Size {
  return {
    width: Math.min(Math.max(size.width, min.width), max.width),
    height: Math.min(Math.max(size.height, min.height), max.height),
  };
}

export function clampPositionToRect(p: Position, bounds: Rect, objectSize: Size): Position {
  return {
    x: Math.min(Math.max(p.x, bounds.x), bounds.x + bounds.width - objectSize.width),
    y: Math.min(Math.max(p.y, bounds.y), bounds.y + bounds.height - objectSize.height),
  };
}
