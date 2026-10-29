import { CanvasSource, Container, FillPattern, Graphics, Texture } from "pixi.js";
import {
  type Board,
  type Coord,
  type CoordKey,
  type PieceId,
  type PlayerView,
  type Tile,
  coordKey,
} from "@occulis/core";
import { cssColor } from "@occulis/ui/tokens";
import {
  type Depth,
  type IsoProjection,
  type ScreenPoint,
  compareDepth,
  depthOf,
  project,
  standingDepth,
} from "@occulis/board/iso";
import { type MoveAnimation, lagging, liftOf, positionOf } from "../../view/animation.js";
import type { Selection } from "../../game/selection.js";
import {
  type LightMap,
  awaitsMove,
  crestAt,
  lightAt,
  litTiles,
  relight,
} from "../../view/reveal.js";
import { type Landing, introLength, introOf, materializeAt } from "../../view/effects.js";
import { easeOutCubic, phase } from "../../view/easing.js";
import { breath, snap } from "@occulis/board/pixel";
import { sameCoord } from "../../view/picking.js";
import { drawSigil } from "./ground.js";
import { drawHover, drawLanding, drawSelection } from "./overlay.js";
import { drawPiece } from "./pieces.js";
import { drawMotes, drawSky } from "./sky.js";
import { drawTile } from "./terrain.js";
import { MOTION_FX, look } from "@occulis/board/theme";

/**
 * Cinq couches, du fond vers l'avant, **toutes redessinées à chaque image** : presque
 * tout y est animé (vague de lumière, entrée du plateau, retombées, respiration), et un
 * plateau de quelques centaines de cases au plus se redessine en une fraction de
 * milliseconde.
 *
 * - `sky` : la voûte d'étoiles, en coordonnées d'écran (`render/pixi/sky.ts`) ;
 * - `ground` : le sceau gravé sous le plateau, pour les thèmes qui l'allument ;
 * - `world` : terrain et pièces, qui doivent partager un **unique ordre du peintre** pour
 *   qu'une pièce derrière un relief soit réellement masquée ;
 * - `overlay` : survol, sélection, retombées, par-dessus le monde ;
 * - `ambient` : les particules en suspension, au-dessus de tout, en coordonnées d'écran.
 *
 * Le pan n'est qu'une translation du conteneur `board`, arrondie à la grille des pixels du
 * plateau pour que la trame ne scintille pas en glissant.
 *
 * Toute l'animation est une fonction de l'horloge de la scène (`time`) et de quelques
 * instants retenus (entrée du plateau, sélection, survol, retombées, apparitions) : les
 * modules purs de `view/` disent où en est chaque effet.
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
  /** `prefers-reduced-motion` : les décors restent figés et tout effet est instantané. */
  readonly still: boolean;
}

interface Occupant {
  readonly id: PieceId;
  readonly coord: Coord;
  readonly color: number;
  readonly ghost: boolean;
  readonly enemy: boolean;
}

/** Les durées en vigueur : celles de `MOTION_FX`, ou nulles sous mouvement réduit. */
const INSTANT = {
  revealMs: 0,
  revealPerTileMs: 0,
  dimMs: 0,
  dimPerTileMs: 0,
  introMs: 0,
  introSpreadMs: 0,
  introDepth: 0,
};

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
  | { readonly depth: Depth; readonly tile: Tile; readonly nearness: number; readonly rank: number }
  | {
      readonly depth: Depth;
      readonly base: ScreenPoint;
      readonly occupant: Occupant;
      /** Opacité d'ensemble ; une image rémanente est un fantôme à demi effacé. */
      readonly alpha: number;
      readonly trail: boolean;
      readonly rise: number;
      readonly flash: number;
      readonly beam: number;
    };

function isTile(drawable: Drawable): drawable is Extract<Drawable, { tile: Tile }> {
  return "tile" in drawable;
}

/** Les pièces réellement vues l'emportent sur un fantôme au même endroit. */
function occupantsOf(view: PlayerView): Map<CoordKey, Occupant> {
  const players = look().players;
  const occupants = new Map<CoordKey, Occupant>();
  for (const ghost of view.ghosts) {
    occupants.set(coordKey(ghost.coord), {
      id: ghost.id,
      coord: ghost.coord,
      color: players[ghost.owner],
      ghost: true,
      enemy: true,
    });
  }
  for (const piece of view.visibleEnemies) {
    occupants.set(coordKey(piece.coord), {
      id: piece.id,
      coord: piece.coord,
      color: players[piece.owner],
      ghost: false,
      enemy: true,
    });
  }
  for (const piece of view.ownPieces) {
    occupants.set(coordKey(piece.coord), {
      id: piece.id,
      coord: piece.coord,
      color: players[piece.owner],
      ghost: false,
      enemy: false,
    });
  }
  return occupants;
}

/** L'éclat de l'œil quand le trait revient au joueur : un battement, puis rien. */
function turnPulse(elapsed: number): number {
  if (elapsed < 0 || elapsed > MOTION_FX.turnMs) return 0;
  return Math.sin(Math.PI * (elapsed / MOTION_FX.turnMs)) * 0.9;
}

export class Scene {
  readonly root = new Container();
  private readonly board = new Container();
  private readonly sky = new Graphics();
  private readonly ground = new Graphics();
  private readonly world = new Graphics();
  private readonly overlay = new Graphics();
  private readonly ambient = new Graphics();
  /** Les trames, une par couleur : le vide pour le fog, la couleur du camp pour un fantôme. */
  private readonly dithers = new Map<number, FillPattern>();
  private readonly resolution: number;
  /** Un pixel du plateau, en unités logiques (pixels CSS). */
  private readonly px: number;

  private time = 0;
  private lastBoard: Board | undefined;
  private lastView: PlayerView | undefined;
  private introStart = 0;
  private light: LightMap | undefined;
  private lastSelection: Selection | undefined;
  private selectedAt = 0;
  private lastHovered: Coord | undefined;
  private hoveredAt = 0;
  private lastAnimation: MoveAnimation | undefined;
  private landings: Landing[] = [];
  /** Les pièces adverses déjà vues, et l'instant où chacune est entrée dans la vue. */
  private seenEnemies: Map<PieceId, Occupant> | undefined;
  private readonly appeared = new Map<PieceId, number>();
  /** Les adversaires sortis de la vue : leur dernière image, qui s'efface sur leur fantôme. */
  private vanished: { readonly occupant: Occupant; readonly start: number }[] = [];
  /** L'instant où le trait est revenu au joueur. */
  private turnAt = -Infinity;

  /** `resolution` : celle du rendu (`@occulis/board/pixel`), un pixel du tampon par pixel du plateau. */
  constructor(resolution: number) {
    this.resolution = resolution;
    this.px = 1 / resolution;
    this.board.addChild(this.ground, this.world, this.overlay);
    this.root.addChild(this.sky, this.board, this.ambient);
  }

  /**
   * Efface la table. Appelé en quittant une partie : sans cela le plateau précédent
   * resterait dessiné derrière le menu, et la partie suivante hériterait de ses effets.
   */
  clear(): void {
    for (const layer of [this.sky, this.ground, this.world, this.overlay, this.ambient])
      layer.clear();
    this.lastBoard = undefined;
    this.lastView = undefined;
    this.light = undefined;
    this.lastSelection = undefined;
    this.lastHovered = undefined;
    this.lastAnimation = undefined;
    this.landings = [];
    this.seenEnemies = undefined;
    this.appeared.clear();
    this.vanished = [];
    this.turnAt = -Infinity;
  }

  render(input: SceneInput, frame: SceneFrame): void {
    if (!frame.still) this.time += frame.deltaMS;
    const now = this.time;
    this.board.position.set(snap(input.origin.x, this.px), snap(input.origin.y, this.px));
    this.track(input, frame.still);

    drawSky(this.sky, frame.width, frame.height, now, this.px);
    this.ground.clear();
    if (look().atmosphere.sigil) {
      const drawn = frame.still
        ? 1
        : easeOutCubic(
            phase(
              now,
              this.introStart + MOTION_FX.introMs * 0.4,
              MOTION_FX.introSpreadMs + MOTION_FX.introMs,
            ),
          );
      drawSigil(this.ground, input.board, input.projection, this.px, now, drawn);
    }
    this.drawWorld(input, frame.still);
    this.drawOverlay(input, frame.still);
    drawMotes(this.ambient, frame.width, frame.height, now, this.px);
  }

  /** Retient les instants qui déclenchent un effet : nouvelle carte, nouvelle vue, sélection, survol, retombée. */
  private track(input: SceneInput, still: boolean): void {
    const now = this.time;
    const timing = still ? INSTANT : MOTION_FX;

    if (input.board !== this.lastBoard) {
      this.lastBoard = input.board;
      this.introStart = now;
      this.light = undefined;
      this.seenEnemies = undefined;
      this.appeared.clear();
      this.landings = [];
      this.vanished = [];
    }

    if (input.view !== this.lastView) {
      const first = this.light === undefined;
      const keys = [...input.board.allTiles()].map((tile) => coordKey(tile.coord));
      const sources = input.view.ownPieces.map((piece) => piece.coord);
      // La première vue attend que le plateau soit à moitié monté pour se déployer.
      const delay = first ? introLength(timing) * 0.55 : 0;
      this.light = relight(this.light, keys, litTiles(input.view), sources, now, timing, delay);

      const occupants = occupantsOf(input.view);
      const visible = new Map(
        [...occupants.values()]
          .filter((occupant) => occupant.enemy && !occupant.ghost)
          .map((occupant) => [occupant.id, occupant]),
      );
      if (this.seenEnemies !== undefined && !still) {
        for (const id of visible.keys()) if (!this.seenEnemies.has(id)) this.appeared.set(id, now);
        for (const [id, occupant] of this.seenEnemies)
          if (!visible.has(id)) this.vanished.push({ occupant, start: now });
      }
      this.seenEnemies = visible;

      const yours = awaitsMove(input.view);
      const wasYours = this.lastView !== undefined && awaitsMove(this.lastView);
      if (yours && !wasYours && !first && !still) this.turnAt = now;
      this.lastView = input.view;
    }

    if (input.selection !== this.lastSelection) {
      if (
        input.selection !== undefined &&
        input.selection.piece.id !== this.lastSelection?.piece.id
      )
        this.selectedAt = now;
      this.lastSelection = input.selection;
    }
    if (!sameCoord(input.hovered, this.lastHovered)) {
      this.hoveredAt = now;
      this.lastHovered = input.hovered;
    }

    const ended =
      this.lastAnimation !== undefined && input.animation?.pieceId !== this.lastAnimation.pieceId;
    if (ended && this.lastAnimation !== undefined && !still) {
      const finished = this.lastAnimation;
      const piece = [...input.view.ownPieces, ...input.view.visibleEnemies].find(
        (p) => p.id === finished.pieceId,
      );
      if (piece !== undefined) {
        this.landings.push({
          coord: finished.to,
          height: finished.toHeight,
          color: look().players[piece.owner],
          start: now,
        });
      }
    }
    this.lastAnimation = input.animation;
    this.landings = this.landings.filter((landing) => now - landing.start < MOTION_FX.landingMs);
    this.vanished = this.vanished.filter((gone) => now - gone.start < MOTION_FX.vanishMs);
  }

  private dither(color: number): FillPattern {
    let pattern = this.dithers.get(color);
    if (pattern === undefined) {
      pattern = ditherPattern(this.resolution, color);
      this.dithers.set(color, pattern);
    }
    return pattern;
  }

  private drawWorld(
    { board, view, projection, animation, selection }: SceneInput,
    still: boolean,
  ): void {
    const g = this.world;
    g.clear();
    const now = this.time;
    const timing = still ? INSTANT : MOTION_FX;
    const sinceIntro = now - this.introStart;

    const tiles = [...board.allTiles()]
      .map((tile) => ({ tile, depth: depthOf(tile.coord, tile.height, projection) }))
      .sort((a, b) => compareDepth(a.depth, b.depth));
    const farthest = tiles[0]?.depth.plane ?? 0;
    const nearest = tiles[tiles.length - 1]?.depth.plane ?? 0;
    const span = nearest - farthest || 1;
    const rankOf = (coord: Coord): number =>
      (depthOf(coord, 0, projection).plane - farthest) / span;

    // Les cases sont poussées avant les pièces : à profondeur égale, le tri étant
    // stable, une pièce se dessine donc toujours après la case qui la porte.
    const drawables: Drawable[] = tiles.map(({ tile, depth }) => {
      const nearness = (depth.plane - farthest) / span;
      return { tile, depth, nearness, rank: nearness };
    });

    const level = projection.heightUnit * projection.scale;
    const occupants = occupantsOf(view);
    for (const occupant of occupants.values()) {
      const moving =
        animation !== undefined && occupant.id === animation.pieceId ? animation : undefined;
      const position = moving === undefined ? undefined : positionOf(moving);
      const at = position?.coord ?? occupant.coord;
      const height = position?.height ?? board.heightAt(occupant.coord) ?? 0;
      const hop = moving === undefined ? 0 : liftOf(moving, MOTION_FX.hopHeight);

      // L'entrée du plateau : une pièce se matérialise juste après que sa case s'est posée.
      const rank = rankOf(occupant.coord);
      const entry = materializeAt(
        this.introStart + rank * timing.introSpreadMs + timing.introMs * 0.7,
        now,
        still ? 0 : MOTION_FX.materializeMs,
      );
      const arrival = this.appeared.get(occupant.id);
      const appear =
        arrival === undefined ? undefined : materializeAt(arrival, now, MOTION_FX.materializeMs);
      const shown = sinceIntro < introLength(timing) + MOTION_FX.materializeMs ? entry : appear;

      const selected = selection !== undefined && selection.piece.id === occupant.id && !still;
      const lift = selected ? easeOutCubic(phase(now, this.selectedAt, MOTION_FX.liftMs)) : 0;

      if (moving !== undefined && !still) {
        for (let i = MOTION_FX.trail; i >= 1; i -= 1) {
          const echo = lagging(moving, i * MOTION_FX.trailLagMs);
          const echoAt = positionOf(echo);
          drawables.push({
            depth: standingDepth(echoAt.coord, board, projection),
            base: project(
              echoAt.coord,
              echoAt.height + liftOf(echo, MOTION_FX.hopHeight),
              projection,
            ),
            occupant: { ...occupant, ghost: true },
            alpha: 0.75 * (1 - i / (MOTION_FX.trail + 1)),
            trail: true,
            rise: 0,
            flash: 0,
            beam: 0,
          });
        }
      }

      const base = project(at, height + hop, projection);
      drawables.push({
        depth: standingDepth(at, board, projection),
        base: { x: base.x, y: base.y - (shown?.drop ?? 0) * this.px },
        occupant,
        alpha: shown?.alpha ?? 1,
        trail: false,
        rise: lift * MOTION_FX.lift * this.px,
        flash: Math.max(
          shown?.flash ?? 0,
          moving === undefined ? 0 : Math.sin(Math.PI * (moving.elapsed / moving.duration)) * 0.5,
          occupant.enemy ? 0 : turnPulse(now - this.turnAt - rank * MOTION_FX.turnSpreadMs),
        ),
        beam: selected ? lift * (0.75 + 0.25 * breath(now, MOTION_FX.breathMs)) : 0,
      });
    }

    // Un adversaire qui sort de la vue : sa dernière image se dissout sur son fantôme.
    for (const gone of this.vanished) {
      const t = phase(now, gone.start, MOTION_FX.vanishMs);
      const coord = gone.occupant.coord;
      const base = project(coord, board.heightAt(coord) ?? 0, projection);
      drawables.push({
        depth: standingDepth(coord, board, projection),
        base: { x: base.x, y: base.y - easeOutCubic(t) * 4 * this.px },
        occupant: { ...gone.occupant, ghost: false },
        alpha: 1 - easeOutCubic(t),
        trail: false,
        rise: 0,
        flash: Math.sin(Math.PI * t) * 0.6,
        beam: 0,
      });
    }

    drawables.sort((a, b) => compareDepth(a.depth, b.depth));

    const fog = this.dither(look().geometry.fogDither);
    for (const drawable of drawables) {
      if (isTile(drawable)) {
        const key = coordKey(drawable.tile.coord);
        const entry = introOf(drawable.rank, sinceIntro, timing);
        drawTile(
          g,
          board,
          drawable.tile,
          {
            light: this.light === undefined ? 0 : lightAt(this.light, key, now),
            crest: this.light === undefined ? 0 : crestAt(this.light, key, now),
            nearness: drawable.nearness,
            px: this.px,
            dither: fog,
            drop: entry.drop * level,
            alpha: entry.alpha,
          },
          projection,
        );
        continue;
      }
      drawPiece(
        g,
        drawable.base,
        {
          color: drawable.occupant.color,
          ghost: drawable.occupant.ghost,
          px: this.px,
          dither: this.dither(drawable.occupant.color),
          alpha: drawable.alpha,
          rise: drawable.rise,
          flash: drawable.flash,
          beam: drawable.beam,
          beamColor: look().selection.piece,
        },
        projection,
      );
    }
  }

  private drawOverlay({ board, projection, hovered, selection }: SceneInput, still: boolean): void {
    const g = this.overlay;
    g.clear();
    const now = this.time;
    const glow = breath(now, MOTION_FX.breathMs);
    const settled = still ? Infinity : 0;
    if (selection !== undefined)
      drawSelection(
        g,
        board,
        selection,
        projection,
        this.px,
        glow,
        Math.max(settled, now - this.selectedAt),
      );
    if (hovered !== undefined)
      drawHover(g, board, hovered, projection, this.px, Math.max(settled, now - this.hoveredAt));
    for (const landing of this.landings) drawLanding(g, board, landing, projection, this.px, now);
  }
}
