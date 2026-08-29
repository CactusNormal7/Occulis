import { type Board, type Coord, type PieceId, chebyshevDistance } from "@occulis/core";

/**
 * Interpolation du déplacement d'une pièce. Module pur : ni PixiJS, ni DOM.
 *
 * L'action est appliquée à l'état **immédiatement** ; seule la position à l'écran
 * est interpolée. L'animation n'est donc jamais une source de vérité, et
 * l'interrompre ne peut pas désynchroniser la partie.
 */

const BASE_MS = 90;
const PER_TILE_MS = 55;
const MAX_MS = 420;

export interface MoveAnimation {
  readonly pieceId: PieceId;
  readonly from: Coord;
  readonly to: Coord;
  readonly fromHeight: number;
  readonly toHeight: number;
  readonly duration: number;
  readonly elapsed: number;
}

/** Position intermédiaire. `coord` est **fractionnaire** : elle n'est pas une case. */
export interface AnimatedPosition {
  readonly coord: Coord;
  readonly height: number;
}

export function startMove(pieceId: PieceId, from: Coord, to: Coord, board: Board): MoveAnimation {
  return {
    pieceId,
    from,
    to,
    fromHeight: board.heightAt(from) ?? 0,
    toHeight: board.heightAt(to) ?? 0,
    // Un long déplacement dure plus longtemps qu'un pas, mais pas proportionnellement :
    // au-delà de quelques cases l'attente deviendrait pénible.
    duration: Math.min(MAX_MS, BASE_MS + PER_TILE_MS * chebyshevDistance(from, to)),
    elapsed: 0,
  };
}

/** Avance l'animation ; `undefined` une fois terminée. */
export function advance(animation: MoveAnimation, deltaMS: number): MoveAnimation | undefined {
  const elapsed = animation.elapsed + deltaMS;
  if (elapsed >= animation.duration) return undefined;
  return { ...animation, elapsed };
}

/** Départ et arrivée adoucis : un déplacement linéaire se lit comme un glissement. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function positionOf(animation: MoveAnimation): AnimatedPosition {
  const t = easeInOutCubic(Math.min(1, animation.elapsed / animation.duration));
  return {
    coord: {
      x: animation.from.x + (animation.to.x - animation.from.x) * t,
      y: animation.from.y + (animation.to.y - animation.from.y) * t,
    },
    height: animation.fromHeight + (animation.toHeight - animation.fromHeight) * t,
  };
}
