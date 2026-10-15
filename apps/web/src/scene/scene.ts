import { CanvasSource, Container, FillPattern, Graphics, Texture } from "pixi.js";
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
import { type Mote, createMotes, moteAt } from "../view/ambient.js";
import { breath, snap } from "../view/pixel.js";
import { drawSigil } from "./ground.js";
import { drawHover, drawSelection } from "./overlay.js";
import { drawPiece } from "./pieces.js";
import { drawTile } from "./terrain.js";
import { cssColor } from "@occulis/ui/tokens";
import { GEOMETRY, MOTES, PLAYERS, SELECTION } from "../theme.js";

/**
 * Quatre couches, du fond vers l'avant.
 *
 * `ground` porte le sceau gravé sous le plateau, et `ambient` les poussières en
 * suspension, au-dessus de tout et en coordonnées d'écran : deux décors qui bougent
 * en permanence, redessinés à chaque image, et assez légers pour cela.
 *
 * `world` réunit terrain et pièces : elles doivent partager un unique ordre du
 * peintre pour qu'une pièce derrière un relief soit réellement masquée, ce qui
 * interdit de les séparer. `overlay` porte survol et sélection, de sorte qu'un
 * mouvement de souris ne reconstruise jamais la géométrie du terrain.
 *
 * `world` n'est réémis que si ses entrées ont changé ; `overlay` aussi, sauf tant
 * qu'une sélection respire. Le pan n'en fait pas partie : c'est une translation du
 * conteneur, pas de la géométrie — arrondie à la grille des pixels du plateau, pour
 * que la trame ne scintille pas en glissant.
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

/** Ce que la scène sait de l'écran, d'une image à l'autre. */
export interface SceneFrame {
  readonly deltaMS: number;
  readonly width: number;
  readonly height: number;
  /** `prefers-reduced-motion` : les décors restent figés, la sélection ne respire plus. */
  readonly still: boolean;
}

interface Occupant {
  readonly id: PieceId;
  readonly coord: Coord;
  readonly color: number;
  readonly ghost: boolean;
}

/**
 * La trame un-sur-deux : un damier de deux pixels sur deux, dont chaque texel couvre
 * exactement un pixel du plateau (`resolution`). La couleur est cuite dans la texture :
 * un motif n'est pas teinté par la couleur de son remplissage.
 */
function ditherPattern(resolution: number, color: number): FillPattern {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext("2d");
  if (context !== null) {
    context.fillStyle = cssColor(color);
    context.fillRect(0, 0, 1, 1);
    context.fillRect(1, 1, 1, 1);
  }
  const source = new CanvasSource({ resource: canvas, resolution, scaleMode: "nearest" });
  return new FillPattern(new Texture({ source }), "repeat");
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
      ghost: true,
    });
  }
  for (const piece of [...view.visibleEnemies, ...view.ownPieces]) {
    occupants.set(coordKey(piece.coord), {
      id: piece.id,
      coord: piece.coord,
      color: PLAYERS[piece.owner],
      ghost: false,
    });
  }

  return occupants;
}

export class Scene {
  readonly root = new Container();
  private readonly board = new Container();
  private readonly ground = new Graphics();
  private readonly world = new Graphics();
  private readonly overlay = new Graphics();
  private readonly ambient = new Graphics();
  private readonly motes: readonly Mote[] = createMotes(MOTES.count, MOTES.seed);
  /** Les trames, une par couleur : le vide pour le fog, la couleur du camp pour un fantôme. */
  private readonly dithers = new Map<number, FillPattern>();
  private readonly resolution: number;
  /** Un pixel du plateau, en unités logiques (pixels CSS). */
  private readonly px: number;
  private time = 0;
  private lastBoard: Board | undefined;
  private lastView: PlayerView | undefined;
  private lastProjection: IsoProjection | undefined;
  private lastHovered: Coord | undefined;
  private lastSelection: Selection | undefined;

  /** `resolution` : celle du rendu (`view/pixel.ts`), un pixel du tampon par pixel du plateau. */
  constructor(resolution: number) {
    this.px = 1 / resolution;
    this.resolution = resolution;
    this.board.addChild(this.ground, this.world, this.overlay);
    this.root.addChild(this.board, this.ambient);
  }

  /**
   * Efface la table. Appelé en quittant une partie : sans cela le plateau précédent
   * resterait dessiné derrière le menu, et la partie suivante hériterait des
   * conditions de réémission de celle d'avant.
   */
  clear(): void {
    this.ground.clear();
    this.world.clear();
    this.overlay.clear();
    this.ambient.clear();
    this.lastBoard = undefined;
    this.lastView = undefined;
    this.lastProjection = undefined;
    this.lastHovered = undefined;
    this.lastSelection = undefined;
  }

  render(input: SceneInput, frame: SceneFrame): void {
    if (!frame.still) this.time += frame.deltaMS;
    this.board.position.set(snap(input.origin.x, this.px), snap(input.origin.y, this.px));

    this.ground.clear();
    drawSigil(this.ground, input.board, input.projection, this.px, this.time);
    this.drawAmbient(frame);

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
    const breathing = input.selection !== undefined && !frame.still;
    if (
      reprojected ||
      breathing ||
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
        drawTile(
          g,
          board,
          drawable.tile,
          { lit, nearness: drawable.nearness, px: this.px, dither: this.dither(GEOMETRY.fogDither) },
          projection,
        );
        continue;
      }
      drawPiece(
        g,
        project(drawable.at, drawable.height, projection),
        {
          color: drawable.occupant.color,
          ghost: drawable.occupant.ghost,
          px: this.px,
          dither: this.dither(drawable.occupant.color),
        },
        projection,
      );
    }
  }

  private drawOverlay({ board, projection, hovered, selection }: SceneInput): void {
    this.overlay.clear();
    const glow = breath(this.time, SELECTION.breathMs);
    if (selection !== undefined) drawSelection(this.overlay, board, selection, projection, this.px, glow);
    if (hovered !== undefined) drawHover(this.overlay, board, hovered, projection, this.px);
  }

  private dither(color: number): FillPattern {
    let pattern = this.dithers.get(color);
    if (pattern === undefined) {
      pattern = ditherPattern(this.resolution, color);
      this.dithers.set(color, pattern);
    }
    return pattern;
  }

  private drawAmbient({ width, height }: SceneFrame): void {
    const g = this.ambient;
    g.clear();
    for (const mote of this.motes) {
      const at = moteAt(mote, this.time, width, height);
      const size = mote.size * this.px;
      g.rect(snap(at.x, this.px), snap(at.y, this.px), size, size).fill({ color: MOTES.color, alpha: at.alpha });
    }
  }
}
