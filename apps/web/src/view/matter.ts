import { GEOMETRY } from "../theme.js";
import { mixColor } from "./pixel.js";

/**
 * La teinte du dessus d'une case. Module pur, partagé par le jeu (`scene/terrain.ts`) et
 * les plateaux Canvas 2D (`canvas/paint.ts`).
 *
 * Une case vue s'éclaircit avec sa hauteur, du sol au plus haut relief : c'est la
 * valeur, et non une teinte, qui fait lire le relief (docs/design.md 8.1). Une case hors
 * de vue garde ce dégradé, très assombri — le relief est public, il n'est jamais masqué
 * (implementation-notes 10).
 */
export function topColor(height: number, lit: boolean): number {
  const rise = Math.max(0, height) / GEOMETRY.peakHeight;
  return lit
    ? mixColor(GEOMETRY.top, GEOMETRY.peak, rise)
    : mixColor(GEOMETRY.fog, GEOMETRY.top, rise * 0.45);
}
