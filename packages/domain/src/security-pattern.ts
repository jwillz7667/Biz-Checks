import { z } from 'zod';

const Color = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Color must be #RRGGBB or #RRGGBBAA');

/**
 * Optional security background drawn underneath every canvas object on a
 * check. The default `none` keeps existing templates byte-identical; the
 * `guilloche` variant draws a parametric line pattern (see
 * `@biz-checks/check-engine` `generateGuilloche`).
 */
export const SecurityPatternSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({
    kind: z.literal('guilloche'),
    color: Color.default('#3b82f6'),
    /** Stroke width in points. */
    lineWidth: z.number().positive().max(3).default(0.4),
    /** Slow harmonic — petal count of the outer envelope. */
    complexity: z.number().int().min(1).max(40).default(7),
    /** Fast harmonic — inner ripple count. Coprime with `complexity` is
     * the most pleasing. */
    density: z.number().int().min(1).max(40).default(13),
    /** Number of overlapping curves with phase-shifted modulation. */
    curves: z.number().int().min(1).max(16).default(5),
    /** Modulation amplitude as a fraction of base radius (0..1). */
    amplitude: z.number().min(0).max(1).default(0.35),
    /** Final stroke opacity (0..1). Background patterns usually <0.5. */
    opacity: z.number().min(0).max(1).default(0.25),
  }),
]);
export type SecurityPattern = z.infer<typeof SecurityPatternSchema>;

export const NO_SECURITY_PATTERN: SecurityPattern = { kind: 'none' };
