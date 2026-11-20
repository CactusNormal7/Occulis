/**
 * Deux outils de tracé Canvas 2D partagés par la peinture du plateau (`paint.ts`) et
 * celle des pièces (`paint-obelisk.ts`, `paint-glyph.ts`).
 */

/** Un pixel du tampon, en unités du tracé courant (la transformation est une simple échelle). */
export function pixelOf(context: CanvasRenderingContext2D): number {
  return 1 / (context.getTransform().a || 1);
}

/** Trace un polygone fermé depuis une liste plate `[x0, y0, x1, y1, …]`. */
export function tracePoints(context: CanvasRenderingContext2D, points: readonly number[]): void {
  context.beginPath();
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i] ?? 0;
    const y = points[i + 1] ?? 0;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}
