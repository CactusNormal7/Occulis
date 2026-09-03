import { Container, Graphics } from "pixi.js";
import {
  type Board,
  type Coord,
  type CoordKey,
  type PieceId,
  type PlayerView,
  type Tile,
  coordEquals,
  coordKey,
} from "@occulis/core";
import {
  type Depth,
  type IsoProjection,
  type ScreenPoint,
  compareDepth,
  depthOf,
  project,
} from "../view/iso.js";
import { type MoveAnimation, positionOf } from "../view/animation.js";
import type { Selection } from "../game/selection.js";
import { drawHover, drawSelection } from "./overlay.js";
import { drawPiece } from "./pieces.js";
import { drawTile } from "./terrain.js";
import { PIECES, PLAYERS } from "../theme.js";

/**
 * Deux couches seulement.
 *
 * `world` réunit terrain et pièces : elles doivent partager un unique ordre du
 * peintre pour qu'une pièce derrière un relief soit réellement masquée, ce qui
 * interdit de les séparer. `overlay` porte survol et sélection, de sorte qu'un
 * mouvement de souris ne reconstruise jamais la géométrie du terrain.
 *
 * Chaque couche n'est réémise que si ses entrées ont changé. Le pan n'en fait
 * pas partie : c'est une translation du conteneur, pas de la géométrie.
 */

export interface SceneInput {
  readonly board: Board;
  readonly view: PlayerView;
  readonly projection: IsoProjection;
  readonly origin: ScreenPoint;
  readonly hovered: Coord | undefined;
  readonly selection: Selection | undefined;
  /** Déplacement en cours ; la pièce concernée est dessinée à sa position interpolée. */
  readonly animation: MoveAnimation | undefined;
}

interface Occupant {
  readonly id: PieceId;
  readonly coord: Coord;
  readonly color: number;
  readonly alpha: number;
}

/** Un élément du monde, trié par profondeur avec tous les autres. */
type Drawable =
  | { readonly depth: Depth; readonly tile: Tile; readonly nearness: number }
  | {
      readonly depth: Depth;
      readonly at: Coord;
      readonly height: number;
      readonly occupant: Occupant;
    };

function isTile(drawable: Drawable): drawable is Extract<Drawable, { tile: Tile }> {
  return "tile" in drawable;
}

function sameProjection(a: IsoProjection, b: IsoProjection): boolean {
  return (
    a.scale === b.scale &&
    a.rotation === b.rotation &&
    a.tileWidth === b.tileWidth &&
    a.tileHeight === b.tileHeight &&
    a.heightUnit === b.heightUnit &&
    a.pivot.x === b.pivot.x &&
    a.pivot.y === b.pivot.y
  );
}

function sameHover(a: Coord | undefined, b: Coord | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return coordEquals(a, b);
}

/** Les pièces réellement vues l'emportent sur un fantôme au même endroit. */
function occupantsOf(view: PlayerView): Map<CoordKey, Occupant> {
  const occupants = new Map<CoordKey, Occupant>();

  for (const ghost of view.ghosts) {
    occupants.set(coordKey(ghost.coord), {
      id: ghost.id,
      coord: ghost.coord,
      color: PLAYERS[ghost.owner],
      alpha: PIECES.alphaGhost,
    });
  }
  for (const piece of [...view.visibleEnemies, ...view.ownPieces]) {
    occupants.set(coordKey(piece.coord), {
      id: piece.id,
      coord: piece.coord,
      color: PLAYERS[piece.owner],
      alpha: PIECES.alphaVisible,
    });
  }

  return occupants;
}

export class Scene {
  readonly root = new Container();
  private readonly world = new Graphics();
  private readonly overlay = new Graphics();
  private lastBoard: Board | undefined;
  private lastView: PlayerView | undefined;
  private lastProjection: IsoProjection | undefined;
  private lastHovered: Coord | undefined;
  private lastSelection: Selection | undefined;

  constructor() {
    this.root.addChild(this.world, this.overlay);
  }

  render(input: SceneInput): void {
    this.root.position.set(input.origin.x, input.origin.y);

    const reprojected =
      this.lastProjection === undefined || !sameProjection(this.lastProjection, input.projection);

    // Une pièce en mouvement change de position à chaque image : tant qu'elle
    // glisse, le monde est réémis inconditionnellement.
    if (
      reprojected ||
      input.animation !== undefined ||
      input.board !== this.lastBoard ||
      input.view !== this.lastView
    ) {
      this.drawWorld(input);
      this.lastBoard = input.board;
      this.lastView = input.view;
    }
    if (
      reprojected ||
      input.selection !== this.lastSelection ||
      !sameHover(this.lastHovered, input.hovered)
    ) {
      this.drawOverlay(input);
      this.lastHovered = input.hovered;
      this.lastSelection = input.selection;
    }

    this.lastProjection = input.projection;
  }

  private drawWorld({ board, view, projection, animation }: SceneInput): void {
    const g = this.world;
    g.clear();

    const tiles = [...board.allTiles()]
      .map((tile) => ({ tile, depth: depthOf(tile.coord, tile.height, projection) }))
      .sort((a, b) => compareDepth(a.depth, b.depth));

    const farthest = tiles[0]?.depth.plane ?? 0;
    const nearest = tiles[tiles.length - 1]?.depth.plane ?? 0;
    const span = nearest - farthest || 1;

    const moving = animation === undefined ? undefined : positionOf(animation);
    const occupants = occupantsOf(view);

    // Les cases sont poussées avant les pièces : à profondeur égale, le tri étant
    // stable, une pièce se dessine donc toujours après la case qui la porte.
    const drawables: Drawable[] = tiles.map(({ tile, depth }) => ({
      tile,
      depth,
      nearness: (depth.plane - farthest) / span,
    }));

    for (const occupant of occupants.values()) {
      const animated = animation !== undefined && occupant.id === animation.pieceId;
      const at = animated && moving !== undefined ? moving.coord : occupant.coord;
      const height =
        animated && moving !== undefined ? moving.height : (board.heightAt(occupant.coord) ?? 0);
      drawables.push({ depth: depthOf(at, height, projection), at, height, occupant });
    }

    drawables.sort((a, b) => compareDepth(a.depth, b.depth));

    for (const drawable of drawables) {
      if (isTile(drawable)) {
        const lit = view.visible.has(coordKey(drawable.tile.coord));
        drawTile(g, board, drawable.tile, lit, drawable.nearness, projection);
        continue;
      }
      drawPiece(
        g,
        project(drawable.at, drawable.height, projection),
        drawable.occupant.color,
        drawable.occupant.alpha,
        projection,
      );
    }
  }

  private drawOverlay({ board, projection, hovered, selection }: SceneInput): void {
    this.overlay.clear();
    if (selection !== undefined) drawSelection(this.overlay, board, selection, projection);
    if (hovered !== undefined) drawHover(this.overlay, board, hovered, projection);
  }
}
