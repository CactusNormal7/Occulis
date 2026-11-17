import { look } from "./theme.js";
import { mixColor } from "./pixel.js";

/**
 * La teinte du dessus d'une case. Module pur, partagé par le jeu (`render/pixi/terrain.ts`) et
 * les plateaux Canvas 2D (`@occulis/board/paint`).
 *
 * Une case vue s'éclaircit avec sa hauteur, du sol au plus haut relief : c'est la
 * valeur, et non une teinte, qui fait lire le relief (docs/design.md 8.1). Une case hors
 * de vue garde ce dégradé, très assombri — le relief est public, il n'est jamais masqué
 * (implementation-notes 10). `light` va de 0 (hors de vue) à 1 (en vue) : entre les deux,
 * la case est en train de s'éclairer ou de s'éteindre (`view/reveal.ts`).
 */
export function topColor(height: number, light: number): number {
  const { top, peak, fog, peakHeight } = look().geometry;
  const rise = Math.max(0, height) / peakHeight;
  return mixColor(mixColor(fog, top, rise * 0.45), mixColor(top, peak, rise), light);
}
