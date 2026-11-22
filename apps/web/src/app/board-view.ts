import type { Board as Terrain, Coord } from "@occulis/core";
import type { Board, BoardHooks } from "../render/pixi/board.js";
import type { SceneInput } from "../render/pixi/scene.js";
import {
  type Camera,
  type CameraCommand,
  type Framing,
  commandCamera,
  createCamera,
  flatnessOf,
  footprintOf,
  originOf,
  pivotOf,
  settle,
  toProjection,
  toProjectionSpace,
  withViewport,
} from "../view/camera.js";
import type { ScreenPoint } from "@occulis/board/iso";
import { readColumnOpen, saveColumnOpen } from "../hud/column-choice.js";
import { hudFraming } from "../hud/layout.js";
import { tileAt } from "../view/picking.js";
import type { MatchController } from "./match-controller.js";

/** Ce que le plateau lit et change de la partie en cours. */
export type BoardSubject = Pick<
  MatchController,
  "match" | "hovered" | "selection" | "animation" | "hover" | "pick" | "inspect" | "advance"
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
  /** La colonne de droite de l'ATH est dépliée : le plateau se cadre dans ce qu'elle laisse. */
  private columnShown = readColumnOpen();

  /**
   * `onViewChange` prévient quand la caméra entre dans la vue de dessus ou en sort, par un
   * bouton ou par la barre d'espace : l'ATH allume son bouton et éteint les autres.
   */
  constructor(
    private readonly host: HTMLElement,
    private readonly subject: BoardSubject,
    private readonly onViewChange: () => void = () => {},
  ) {}

  /** La vue de dessus est visée (et la caméra figée). */
  get planView(): boolean {
    return this.camera.planView;
  }

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
    const screen = viewport();
    this.setCamera(
      createCamera(pivotOf(terrain), screen, this.framing(screen), footprintOf(terrain)),
    );
  }

  /** La colonne de droite de l'ATH (fiche et journal) est dépliée. */
  get columnOpen(): boolean {
    return this.columnShown;
  }

  /**
   * Replie ou déplie la colonne de droite, retenu pour les parties suivantes : le plateau
   * glisse vers le milieu de la place libérée, ou rendue.
   */
  toggleColumn(): void {
    this.columnShown = !this.columnShown;
    saveColumnOpen(this.columnShown);
    const screen = viewport();
    this.camera = withViewport(this.camera, screen, this.framing(screen));
  }

  private framing(screen: Coord): Framing {
    return hudFraming(screen, this.columnShown);
  }

  /** Vide la table, à la sortie d'une partie. */
  clear(): void {
    this.board?.clear();
  }

  /** Un bouton de caméra de l'ATH. */
  command(command: CameraCommand): void {
    this.setCamera(commandCamera(this.camera, command));
  }

  private setCamera(next: Camera): void {
    const changed = next.planView !== this.camera.planView;
    this.camera = next;
    if (changed) this.onViewChange();
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
        const screen = viewport();
        // Sous 900 px, la colonne de l'ATH se replie en bas : le recentrage suit.
        this.camera = withViewport(this.camera, screen, this.framing(screen));
      },
      controls: {
        getCamera: () => this.camera,
        setCamera: (next) => this.setCamera(next),
        inMatch: () => this.subject.match !== undefined,
        pickTile: (point) => this.tileUnder(point),
        setHovered: (coord) => this.subject.hover(coord),
        onPick: (coord) => this.subject.pick(coord),
        onInspect: (coord) => this.subject.inspect(coord),
      },
      frame: (deltaMS) => this.frame(deltaMS),
    };
  }

  private tileUnder(point: ScreenPoint): Coord | undefined {
    const match = this.subject.match;
    if (match === undefined) return undefined;
    return tileAt(toProjectionSpace(this.camera, point), match.board, toProjection(this.camera));
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
      flatness: flatnessOf(this.camera),
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
