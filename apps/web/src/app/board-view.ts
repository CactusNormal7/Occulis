import type { Board as Terrain, Coord } from "@occulis/core";
import type { Board, BoardHooks } from "../render/pixi/board.js";
import type { SceneInput } from "../render/pixi/scene.js";
import type { GameConsole } from "../ui/console.js";
import {
  type Camera,
  createCamera,
  originOf,
  pivotOf,
  settle,
  toProjection,
  toProjectionSpace,
  withViewport,
} from "../view/camera.js";
import type { ScreenPoint } from "../view/iso.js";
import { tileAt } from "../view/picking.js";
import type { MatchController } from "./match-controller.js";

/** Ce que le plateau lit et change de la partie en cours. */
export type BoardSubject = Pick<
  MatchController,
  "match" | "hovered" | "selection" | "animation" | "hover" | "pick" | "advance"
>;

/**
 * Le plateau à l'écran : il charge PixiJS à part (`render/pixi/board.ts`), tient la
 * caméra, et rend les gestes du joueur à la partie en cours.
 */
export class BoardView {
  /** Le plateau Pixi ; absent tant qu'il n'est pas chargé. */
  private board: Board | undefined;
  private loading: Promise<Board | undefined> | undefined;
  private camera: Camera = createCamera({ x: 0, y: 0 }, viewport());

  constructor(
    private readonly host: HTMLElement,
    private readonly subject: BoardSubject,
    private readonly gameConsole: Pick<GameConsole, "showTile" | "playAction">,
  ) {}

  /**
   * Charge le plateau une seule fois. Un échec (pas de WebGL) laisse le menu utilisable :
   * il ne coûte que la partie, qui ne s'affichera pas.
   */
  ensure(): Promise<Board | undefined> {
    this.loading ??= this.load();
    return this.loading;
  }

  /**
   * Charge le plateau au repos, une fois le menu affiché : rien ne l'attend avant.
   * `alongside` part au même moment, et seulement si le plateau n'était pas déjà en route.
   */
  prewarm(alongside: () => void): void {
    if (this.loading !== undefined) return;
    whenIdle(() => {
      void this.ensure();
      alongside();
    });
  }

  /** Recentre la caméra sur la carte d'une partie qui commence. */
  center(terrain: Terrain): void {
    this.camera = createCamera(pivotOf(terrain), viewport());
  }

  /** Vide la table, à la sortie d'une partie. */
  clear(): void {
    this.board?.clear();
  }

  private async load(): Promise<Board | undefined> {
    try {
      const { mountBoard } = await import("../render/pixi/board.js");
      this.board = await mountBoard(this.host, this.hooks());
      return this.board;
    } catch (error: unknown) {
      console.error("board unavailable", error);
      return undefined;
    }
  }

  private hooks(): BoardHooks {
    return {
      onResize: () => {
        this.camera = withViewport(this.camera, viewport());
      },
      controls: {
        getCamera: () => this.camera,
        setCamera: (next) => {
          this.camera = next;
        },
        pickTile: (point) => this.tileUnder(point),
        setHovered: (coord) => this.subject.hover(coord),
        onPick: (coord) => this.pick(coord),
      },
      frame: (deltaMS) => this.frame(deltaMS),
    };
  }

  private tileUnder(point: ScreenPoint): Coord | undefined {
    const match = this.subject.match;
    if (match === undefined) return undefined;
    return tileAt(toProjectionSpace(this.camera, point), match.board, toProjection(this.camera));
  }

  private pick(coord: Coord | undefined): void {
    if (this.subject.match === undefined) return;
    this.gameConsole.showTile(coord);

    const action = this.subject.pick(coord);
    if (action !== undefined) this.gameConsole.playAction(action);
  }

  private frame(deltaMS: number): SceneInput | undefined {
    const match = this.subject.match;
    if (match === undefined) return undefined;

    this.camera = settle(this.camera, deltaMS);
    this.subject.advance(deltaMS);

    return {
      board: match.board,
      view: match.viewFor(match.player),
      projection: toProjection(this.camera),
      origin: originOf(this.camera),
      hovered: this.subject.hovered,
      selection: this.subject.selection,
      animation: this.subject.animation,
    };
  }
}

/**
 * Le canevas suit la fenêtre (`resizeTo: window`) : ses dimensions sont les siennes,
 * connues avant même que Pixi soit chargé.
 */
function viewport(): Coord {
  return { x: window.innerWidth, y: window.innerHeight };
}

function whenIdle(task: () => void): void {
  if (typeof requestIdleCallback === "function") requestIdleCallback(task);
  else setTimeout(task, 1);
}
