import type { Graphics } from "pixi.js";
import type { Board } from "@occulis/core";
import { type IsoProjection, type ScreenPoint, project } from "../../view/iso.js";
import { look } from "../../theme/theme.js";

/**
 * Le sceau gravé dans le vide sous le plateau (theme.ts, `sigil`), allumé par certains
 * thèmes seulement. Décor pur : il ne lit que la forme de la carte, jamais l'état de la
 * partie.
 *
 * Il est posé dans le plan du sol et projeté comme les cases, point par point : il
 * suit donc la rotation et le zoom de la caméra sans rien savoir d'elle. À l'entrée du
 * plateau, il se **trace** : ses cercles se referment et ses glyphes s'allument
 * (`drawn`, 0 → 1).
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
    look().sigil.height,
    proj,
  );
}

/** Un cercle tracé sur la fraction `drawn` de son tour, à partir de l'angle `from`. */
function arc(
  g: Graphics,
  radius: number,
  from: number,
  drawn: number,
  proj: IsoProjection,
  width: number,
  alpha: number,
): void {
  const steps = Math.max(2, Math.round(128 * drawn));
  const start = at(from, radius, proj);
  g.moveTo(start.x, start.y);
  for (let i = 1; i <= steps; i += 1) {
    const p = at(from + (i / steps) * Math.PI * 2 * drawn, radius, proj);
    g.lineTo(p.x, p.y);
  }
  g.stroke({ width, color: look().sigil.stroke, alpha });
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
  alpha: number,
): void {
  const sigil = look().sigil;
  const c = at(angle, radius, proj);
  const style = { width: px, color: sigil.stroke, alpha };
  if (kind === 0) {
    g.poly([c.x, c.y - size, c.x + size * 0.6, c.y, c.x, c.y + size, c.x - size * 0.6, c.y]).stroke(
      style,
    );
  } else if (kind === 1) {
    const inner = at(angle, radius - sigil.ring * 0.35, proj);
    const outer = at(angle, radius + sigil.ring * 0.35, proj);
    g.moveTo(inner.x, inner.y).lineTo(outer.x, outer.y).stroke(style);
    g.circle(outer.x, outer.y, px * 1.5).fill({ color: sigil.stroke, alpha });
  } else {
    g.ellipse(c.x, c.y, size, size * 0.45).stroke(style);
    g.circle(c.x, c.y, px).fill({ color: sigil.stroke, alpha });
  }
}

export function drawSigil(
  g: Graphics,
  board: Board,
  proj: IsoProjection,
  px: number,
  timeMs: number,
  drawn: number,
): void {
  const sigil = look().sigil;
  if (drawn <= 0) return;
  const inner = boardRadius(board, proj) + sigil.margin;
  const outer = inner + sigil.ring;
  const turn = (timeMs / 1000) * sigil.speed;

  arc(g, inner, -Math.PI / 2, drawn, proj, px, sigil.alpha);
  arc(g, outer, Math.PI / 2, drawn, proj, px, sigil.alpha);
  arc(g, outer + sigil.ring * 0.4, 0, drawn, proj, px, sigil.alpha * 0.5);

  // Les graduations tournent dans un sens…
  for (let i = 0; i < sigil.ticks * drawn; i += 1) {
    const angle = turn + (i / sigil.ticks) * Math.PI * 2;
    const long = i % 4 === 0;
    const a = at(angle, inner, proj);
    const b = at(angle, inner + sigil.ring * (long ? 0.6 : 0.3), proj);
    g.moveTo(a.x, a.y)
      .lineTo(b.x, b.y)
      .stroke({ width: px, color: sigil.stroke, alpha: sigil.alpha });
  }

  // …et les glyphes dans l'autre, sur l'anneau extérieur.
  const size = sigil.ring * proj.tileHeight * proj.scale * 0.35;
  for (let i = 0; i < sigil.glyphs; i += 1) {
    const angle = -turn * 1.6 + (i / sigil.glyphs) * Math.PI * 2;
    glyph(g, i % 3, angle, outer + sigil.ring * 0.4, size, proj, px, sigil.glyphAlpha * drawn);
  }
}
