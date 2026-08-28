import { Container, Graphics } from "pixi.js";
import {
  type Board,
  type Coord,
  type CoordKey,
  type PlayerView,
  coordEquals,
  coordKey,
} from "@occulis/core";
import { type IsoProjection, type ScreenPoint, compareDepth, depthOf, project } from "./iso.js";
import { drawHover } from "./draw/overlay.js";
import { drawPiece } from "./draw/pieces.js";
import { drawTile } from "./draw/terrain.js";
import { PIECES, PLAYERS } from "./theme.js";

/**
 * Deux couches seulement.
 *
 * `world` réunit terrain et pièces : elles doivent partager un unique ordre du
 * peintre pour qu'une pièce derrière un relief soit réellement masquée, ce qui
 * interdit de les séparer. `overlay` porte la surbrillance, de sorte qu'un
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
}

interface Occupant {
  readonly color: number;
  readonly alpha: number;
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
      color: PLAYERS[ghost.owner],
      alpha: PIECES.alphaGhost,
    });
  }
  for (const piece of [...view.visibleEnemies, ...view.ownPieces]) {
    occupants.set(coordKey(piece.coord), {
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

  constructor() {
    this.root.addChild(this.world, this.overlay);
  }

  render(input: SceneInput): void {
    this.root.position.set(input.origin.x, input.origin.y);

    const reprojected =
      this.lastProjection === undefined || !sameProjection(this.lastProjection, input.projection);

    if (reprojected || input.board !== this.lastBoard || input.view !== this.lastView) {
      this.drawWorld(input);
      this.lastBoard = input.board;
      this.lastView = input.view;
    }
    if (reprojected || !sameHover(this.lastHovered, input.hovered)) {
      this.drawOverlay(input);
      this.lastHovered = input.hovered;
    }

    this.lastProjection = input.projection;
  }

  private drawWorld({ board, view, projection }: SceneInput): void {
    const g = this.world;
    g.clear();

    const occupants = occupantsOf(view);
    const cells = [...board.allTiles()]
      .map((tile) => ({ tile, depth: depthOf(tile.coord, tile.height, projection) }))
      .sort((a, b) => compareDepth(a.depth, b.depth));

    const farthest = cells[0]?.depth.plane ?? 0;
    const nearest = cells[cells.length - 1]?.depth.plane ?? 0;
    const span = nearest - farthest || 1;

    for (const { tile, depth } of cells) {
      const key = coordKey(tile.coord);
      drawTile(g, board, tile, view.visible.has(key), (depth.plane - farthest) / span, projection);

      const occupant = occupants.get(key);
      if (occupant !== undefined) {
        drawPiece(
          g,
          project(tile.coord, tile.height, projection),
          occupant.color,
          occupant.alpha,
          projection,
        );
      }
    }
  }

  private drawOverlay({ board, projection, hovered }: SceneInput): void {
    this.overlay.clear();
    if (hovered !== undefined) drawHover(this.overlay, board, hovered, projection);
  }
}
