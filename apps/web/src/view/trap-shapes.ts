import type { Quad, ScreenPoint } from "@occulis/board/iso";

/**
 * La géométrie du piège à l'écran, partagée par le jeu (`render/pixi/trap-fx.ts`, PixiJS)
 * et le rejeu (`replay/trap-paint.ts`, Canvas 2D) : les deux dessinent le même sceau et
 * les mêmes mâchoires. Pur : des points, aucun dessin.
 */

/** Le quadrilatère `quad` mis à l'échelle `k` autour de son centre. */
export function scaleQuad(quad: Quad, k: number): ScreenPoint[] {
  const cx = (quad[0].x + quad[2].x) / 2;
  const cy = (quad[0].y + quad[2].y) / 2;
  return quad.map((p) => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k }));
}

/**
 * Le sceau d'un piège : le losange de la case à l'échelle `k`, et ses deux diagonales,
 * qui le barrent d'une croix.
 */
export function trapSealOf(
  quad: Quad,
  k: number,
): { readonly outline: ScreenPoint[]; readonly cross: [ScreenPoint, ScreenPoint][] } {
  const outline = scaleQuad(quad, k);
  const [nw, ne, se, sw] = outline as [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  return {
    outline,
    cross: [
      [nw, se],
      [ne, sw],
    ],
  };
}

/** Un point de la case, en coordonnées locales (`u` d'ouest en est, `v` du nord au sud). */
function pointIn(quad: Quad, u: number, v: number): ScreenPoint {
  const [nw, ne, se, sw] = quad;
  return {
    x: (1 - u) * (1 - v) * nw.x + u * (1 - v) * ne.x + u * v * se.x + (1 - u) * v * sw.x,
    y: (1 - u) * (1 - v) * nw.y + u * (1 - v) * ne.y + u * v * se.y + (1 - u) * v * sw.y,
  };
}

const TEETH = 5;
const TOOTH_DEPTH = 0.09;

/**
 * Les deux mâchoires d'un piège qui se ferme, une de chaque côté de la case. `jaws` va de
 * 0 (ouvertes, collées au bord) à 1 (fermées au milieu), un peu au-delà pendant le
 * rebond. Les dents d'un côté tombent dans les creux de l'autre : elles s'emboîtent.
 */
export function trapJawsOf(quad: Quad, jaws: number): [ScreenPoint[], ScreenPoint[]] {
  const reach = 0.1 + 0.4 * Math.min(1.08, jaws);
  const jaw = (side: 0 | 1): ScreenPoint[] => {
    const at = (depth: number, v: number) => pointIn(quad, side === 0 ? depth : 1 - depth, v);
    const points = [at(0, 0)];
    for (let i = 0; i <= TEETH * 2; i += 1) {
      const tooth = (i + side) % 2 === 1 ? TOOTH_DEPTH : 0;
      points.push(at(reach + tooth, i / (TEETH * 2)));
    }
    points.push(at(0, 1));
    return points;
  };
  return [jaw(0), jaw(1)];
}
