import { z } from 'zod';

export const UnitSystem = ['inch', 'mm', 'pt'] as const;
export type Unit = (typeof UnitSystem)[number];

export const UnitSchema = z.enum(UnitSystem);

const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;

/**
 * Internal canonical unit is points (pt) — PDF native, lossless for inch and mm
 * conversion at all reasonable check sizes.
 */
export type Points = number;

export function toPoints(value: number, unit: Unit): Points {
  switch (unit) {
    case 'pt':
      return value;
    case 'inch':
      return value * POINTS_PER_INCH;
    case 'mm':
      return (value / MM_PER_INCH) * POINTS_PER_INCH;
  }
}

export function fromPoints(value: Points, unit: Unit): number {
  switch (unit) {
    case 'pt':
      return value;
    case 'inch':
      return value / POINTS_PER_INCH;
    case 'mm':
      return (value / POINTS_PER_INCH) * MM_PER_INCH;
  }
}

export interface Size {
  readonly width: Points;
  readonly height: Points;
}

export interface Position {
  readonly x: Points;
  readonly y: Points;
}

export interface Rect extends Position, Size {}

export interface Margins {
  readonly top: Points;
  readonly right: Points;
  readonly bottom: Points;
  readonly left: Points;
}

export const SizeSchema = z.object({
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
});

export const PositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const RectSchema = SizeSchema.merge(PositionSchema);

export const MarginsSchema = z.object({
  top: z.number().nonnegative().finite(),
  right: z.number().nonnegative().finite(),
  bottom: z.number().nonnegative().finite(),
  left: z.number().nonnegative().finite(),
});

export const PaperSizes = {
  Letter: { width: 8.5 * POINTS_PER_INCH, height: 11 * POINTS_PER_INCH },
  Legal: { width: 8.5 * POINTS_PER_INCH, height: 14 * POINTS_PER_INCH },
  A4: { width: (210 / MM_PER_INCH) * POINTS_PER_INCH, height: (297 / MM_PER_INCH) * POINTS_PER_INCH },
} as const satisfies Record<string, Size>;

export type PaperSize = keyof typeof PaperSizes;
export const PaperSizeSchema = z.enum(['Letter', 'Legal', 'A4'] as const);
