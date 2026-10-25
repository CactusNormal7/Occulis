import type { Action, Coord } from "@occulis/core";
import type { OnlineMatch } from "../game/online-match.js";
import type { Movement } from "../game/movement-diff.js";
import { type Selection, resolveClick } from "../game/selection.js";
import { type MoveAnimation, advance, startMove } from "../view/animation.js";
import {
  createCamera,
  originOf,
  pivotOf,
  settle,
  toProjection,
  toProjectionSpace,
  withViewport,
} from "../view/camera.js";
import { tileAt } from "../view/picking.js";
import type { Board } from "./pixi/board.js";

interface GameBoardHooks {
  readonly match: () => OnlineMatch | undefined;
  readonly showTile: (coord: Coord | undefined) => void;
  readonly playAction: (action: Action) => void;
  readonly onAnimationEnd: () => void;
}

export interface GameBoard {
  load(): Promise<Board | undefined>;
  hasStartedLoading(): boolean;
  center(): void;
  animate(movement?: Movement): void;
  clearSelection(): void;
  clear(): void;
}

/**
 * L'état visuel du plateau : caméra, survol, sélection et animation. La partie reste
 * détenue par la composition et ne change qu'à réception d'une vue du serveur.
 * Pixi reste chargé à la demande pour laisser le menu paraître sans attendre WebGL.
 */
export function createGameBoard(host: HTMLElement, hooks: GameBoardHooks): GameBoard {
  const viewport = (): Coord => ({ x: window.innerWidth, y: window.innerHeight });
  let camera = createCamera({ x: 0, y: 0 }, viewport());
  let hovered: Coord | undefined;
  let selection: Selection | undefined;
  let animation: MoveAnimation | undefined;
  let board: Board | undefined;
  let loading: Promise<Board | undefined> | undefined;

  function load(): Promise<Board | undefined> {
    loading ??= import("./pixi/board.js")
      .then(({ mountBoard }) =>
        mountBoard(host, {
          onResize: () => {
            camera = withViewport(camera, viewport());
          },
          controls: {
            getCamera: () => camera,
            setCamera: (next) => {
              camera = next;
            },
            pickTile: (point) => {
              const match = hooks.match();
              if (match === undefined) return undefined;
              return tileAt(toProjectionSpace(camera, point), match.board, toProjection(camera));
            },
            setHovered: (coord) => {
              hovered = coord;
            },
            onPick: (coord) => {
              const match = hooks.match();
              if (match === undefined) return;
              hooks.showTile(coord);
              const outcome = resolveClick(match.legalActions, match.state, selection, coord);
              if (outcome.kind === "select") selection = outcome.selection;
              else if (outcome.kind === "clear") selection = undefined;
              else hooks.playAction(outcome.action);
            },
          },
          frame: (deltaMS) => {
            const match = hooks.match();
            if (match === undefined) return undefined;
            camera = settle(camera, deltaMS);
            if (animation !== undefined) {
              animation = advance(animation, deltaMS);
              if (animation === undefined) hooks.onAnimationEnd();
            }
            return {
              board: match.board,
              view: match.viewFor(match.player),
              projection: toProjection(camera),
              origin: originOf(camera),
              hovered,
              selection,
              animation,
            };
          },
        }),
      )
      .then((mounted) => {
        board = mounted;
        return mounted;
      })
      .catch((error: unknown) => {
        // Un échec WebGL ne doit pas rendre le menu inutilisable.
        console.error("board unavailable", error);
        return undefined;
      });
    return loading;
  }

  return {
    load,
    hasStartedLoading: () => loading !== undefined,
    center: () => {
      const match = hooks.match();
      if (match !== undefined) camera = createCamera(pivotOf(match.board), viewport());
    },
    animate: (movement) => {
      selection = undefined;
      const match = hooks.match();
      animation =
        movement === undefined || match === undefined
          ? undefined
          : startMove(movement.pieceId, movement.from, movement.to, match.board);
    },
    clearSelection: () => {
      selection = undefined;
    },
    clear: () => {
      selection = undefined;
      animation = undefined;
      hovered = undefined;
      board?.clear();
    },
  };
}
