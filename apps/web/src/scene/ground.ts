import type { Graphics } from "pixi.js";
import type { Board } from "@occulis/core";
import { type IsoProjection, type ScreenPoint, project } from "../view/iso.js";
import { SIGIL } from "../theme.js";

/**
 * Le sceau gravé dans le vide sous le plateau (theme.ts, `SIGIL`). Décor pur : il ne
 * lit que la forme de la carte, jamais l'état de la partie.
 *
 * Il est posé dans le plan du sol et projeté comme les cases, point par point : il
 * suit donc la rotation et le zoom de la caméra sans rien savoir d'elle.
 */

/** Le rayon du plateau autour du pivot, en cases : le cercle doit le contenir entier. */
export function boardRadius(board: Board, proj: IsoProjection): number {
  let radius = 0;
  for (const tile of board.allTiles()) {
    const dx = Math.abs(tile.coord.x - proj.pivot.x) + 0.5;
    const dy = Math.abs(tile.coord.y - proj.pivot.y) + 0.5;
    radius = Math.max(radius, Math.hypot(dx, dy));
  }
  return radius;
}

function at(angle: number, radius: number, proj: IsoProjection): ScreenPoint {
  return project(
    { x: proj.pivot.x + Math.cos(angle) * radius, y: proj.pivot.y + Math.sin(angle) * radius },
    SIGIL.height,
    proj,
  );
}

function circle(
  g: Graphics,
  radius: number,
  proj: IsoProjection,
  width: number,
  alpha: number,
): void {
  const steps = 128;
  const points: number[] = [];
  for (let i = 0; i < steps; i += 1) {
    const p = at((i / steps) * Math.PI * 2, radius, proj);
    points.push(p.x, p.y);
  }
  g.poly(points).stroke({ width, color: SIGIL.stroke, alpha });
}

/**
 * Les glyphes : trois formes qui alternent autour du cercle — un losange, une barre, un
 * œil. Elles ne veulent rien dire, et c'est voulu.
 */
function glyph(
  g: Graphics,
  kind: number,
  angle: number,
  radius: number,
  size: number,
  proj: IsoProjection,
  px: number,
): void {
  const c = at(angle, radius, proj);
  const style = { width: px, color: SIGIL.stroke, alpha: SIGIL.glyphAlpha };
  if (kind === 0) {
    g.poly([c.x, c.y - size, c.x + size * 0.6, c.y, c.x, c.y + size, c.x - size * 0.6, c.y]).stroke(
      style,
    );
  } else if (kind === 1) {
    const inner = at(angle, radius - SIGIL.ring * 0.35, proj);
    const outer = at(angle, radius + SIGIL.ring * 0.35, proj);
    g.moveTo(inner.x, inner.y).lineTo(outer.x, outer.y).stroke(style);
    g.circle(outer.x, outer.y, px * 1.5).fill({ color: SIGIL.stroke, alpha: SIGIL.glyphAlpha });
  } else {
    g.ellipse(c.x, c.y, size, size * 0.45).stroke(style);
    g.circle(c.x, c.y, px).fill({ color: SIGIL.stroke, alpha: SIGIL.glyphAlpha });
  }
}

export function drawSigil(
  g: Graphics,
  board: Board,
  proj: IsoProjection,
  px: number,
  timeMs: number,
): void {
  const inner = boardRadius(board, proj) + SIGIL.margin;
  const outer = inner + SIGIL.ring;
  const turn = (timeMs / 1000) * SIGIL.speed;

  circle(g, inner, proj, px, SIGIL.alpha);
  circle(g, outer, proj, px, SIGIL.alpha);
  circle(g, outer + SIGIL.ring * 0.4, proj, px, SIGIL.alpha * 0.5);

  // Les graduations tournent dans un sens…
  for (let i = 0; i < SIGIL.ticks; i += 1) {
    const angle = turn + (i / SIGIL.ticks) * Math.PI * 2;
    const long = i % 4 === 0;
    const a = at(angle, inner, proj);
    const b = at(angle, inner + SIGIL.ring * (long ? 0.6 : 0.3), proj);
    g.moveTo(a.x, a.y)
      .lineTo(b.x, b.y)
      .stroke({ width: px, color: SIGIL.stroke, alpha: SIGIL.alpha });
  }

  // …et les glyphes dans l'autre, sur l'anneau extérieur.
  const size = SIGIL.ring * proj.tileHeight * proj.scale * 0.35;
  for (let i = 0; i < SIGIL.glyphs; i += 1) {
    const angle = -turn * 1.6 + (i / SIGIL.glyphs) * Math.PI * 2;
    glyph(g, i % 3, angle, outer + SIGIL.ring * 0.4, size, proj, px);
  }
}
