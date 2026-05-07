/**
 * Guilloche pattern generator.
 *
 * A guilloche is the woven, mathematically-generated line pattern used as a
 * security background on currency, passports, and certificates. Two or more
 * curves with phase-shifted modulation overlay to produce a pattern that
 * cannot be cleanly reproduced by photocopy or low-resolution scan.
 *
 * This implementation is a parametric rosette stretched to fit a bounding
 * box. Each curve `c` of `curves` total is sampled at `steps + 1` evenly
 * spaced points around the unit circle. The radial modulation is the
 * product of two harmonics — a slow `complexity`-fold and a fast
 * `density`-fold — so neighbouring curves drift in and out of register and
 * create the woven visual.
 *
 * The output is intentionally engine-agnostic: each curve is a flat
 * Float32Array of [x0, y0, x1, y1, ...] coordinates in the same point
 * space as the bounding box. Renderers can stream them to PDF
 * (drawSvgPath) or to Canvas/Konva (Line points) without further math.
 */

export interface GuillocheOptions {
  /** Bounding-box width in points. */
  width: number;
  /** Bounding-box height in points. */
  height: number;
  /** Slow harmonic — controls the petal count of the outer envelope. */
  complexity: number;
  /** Fast harmonic — controls the inner ripple count. Coprime with
   * `complexity` makes the most pleasing patterns. */
  density: number;
  /** Number of overlapping curves with phase-shifted modulation. */
  curves: number;
  /** Sampling resolution per curve. 360 looks good at print resolution. */
  steps: number;
  /** Modulation amplitude as a fraction of the base radius (0..1). */
  amplitude: number;
}

export const DEFAULT_GUILLOCHE: Readonly<Omit<GuillocheOptions, 'width' | 'height'>> = {
  complexity: 7,
  density: 13,
  curves: 5,
  steps: 360,
  amplitude: 0.35,
};

/**
 * Sample the guilloche curves into flat [x,y,...] streams. The result is
 * `curves` Float32Arrays, each of length (steps + 1) * 2.
 */
export function generateGuilloche(opts: GuillocheOptions): readonly Float32Array[] {
  const { width, height, complexity, density, curves, steps, amplitude } = opts;

  // Centre the rosette on the bounding-box centre.
  const cx = width / 2;
  const cy = height / 2;

  // Peak radial modulation is `1 + amplitude`. Divide the base radius by
  // that factor (and back off 5%) so even the outermost peak stays inside
  // the bounding box — otherwise the rosette spills past the printable area.
  const radiusFactor = 0.95 / (1 + amplitude);
  const radiusX = (width / 2) * radiusFactor;
  const radiusY = (height / 2) * radiusFactor;

  const out: Float32Array[] = [];
  const TWO_PI = Math.PI * 2;

  for (let c = 0; c < curves; c += 1) {
    const phase = (c / curves) * TWO_PI;
    const buf = new Float32Array((steps + 1) * 2);
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * TWO_PI;
      // Modulation is the product of two harmonics — gives the woven look.
      const modulation =
        1 + amplitude * Math.sin(complexity * t + phase) * Math.cos(density * t);
      buf[i * 2] = cx + radiusX * Math.cos(t) * modulation;
      buf[i * 2 + 1] = cy + radiusY * Math.sin(t) * modulation;
    }
    out.push(buf);
  }

  return out;
}

/**
 * Convert a flat [x,y,...] stream into an SVG path string ("M x y L x y …").
 * Useful for renderers that take SVG paths directly (pdf-lib, browser SVG).
 */
export function curveToSvgPath(points: Float32Array): string {
  if (points.length < 4) return '';
  const parts: string[] = [`M ${fmt(points[0]!)} ${fmt(points[1]!)}`];
  for (let i = 2; i < points.length; i += 2) {
    parts.push(`L ${fmt(points[i]!)} ${fmt(points[i + 1]!)}`);
  }
  return parts.join(' ');
}

function fmt(n: number): string {
  // 2 decimals is more than enough at print resolution and keeps PDF size
  // proportional to the curve count, not the precision.
  return n.toFixed(2);
}
