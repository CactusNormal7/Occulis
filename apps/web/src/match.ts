import {
  type Action,
  type ActionError,
  type Board,
  type Coord,
  type GameState,
  type Piece,
  type PlayerId,
  type PlayerKnowledge,
  type PlayerView,
  type Result,
  applyAction,
  emptyKnowledge,
  observe,
  pieceAt,
  viewFor,
} from "@occulis/core";

/**
 * Une partie jouée en local, avec la mémoire de chaque joueur.
 *
 * Module pur : ni Pixi, ni DOM. Il tient ce que le futur Durable Object tiendra —
 * l'état réel et les deux `PlayerKnowledge` — et n'expose vers le rendu que des
 * `PlayerView` (docs/architecture.md section 2). Câbler le serveur reviendra à
 * remplacer cette classe par un transport, sans toucher au reste du client.
 */
export class Match {
  private current: GameState;
  private knowledge: Record<PlayerId, PlayerKnowledge>;
  /**
   * `Scene` ne redessine que si la vue a changé d'identité : les vues doivent donc
   * être stables entre deux actions, et recalculées une seule fois après chacune.
   */
  private views = new Map<PlayerId, PlayerView>();

  constructor(state: GameState) {
    this.current = state;
    this.knowledge = {
      A: observe(emptyKnowledge("A"), state),
      B: observe(emptyKnowledge("B"), state),
    };
  }

  get state(): GameState {
    return this.current;
  }

  get board(): Board {
    return this.current.board;
  }

  get activePlayer(): PlayerId {
    return this.current.activePlayer;
  }

  get isOver(): boolean {
    return this.current.outcome !== null;
  }

  pieceAt(coord: Coord): Piece | undefined {
    return pieceAt(this.current, coord);
  }

  viewFor(player: PlayerId): PlayerView {
    const cached = this.views.get(player);
    if (cached !== undefined) return cached;

    const view = viewFor(this.current, this.knowledge[player]);
    this.views.set(player, view);
    return view;
  }

  /** Applique une action ; l'état ne bouge pas si elle est refusée. */
  play(action: Action): Result<GameState, ActionError> {
    const result = applyAction(this.current, action);
    if (!result.ok) return result;

    this.current = result.value;
    this.knowledge = {
      A: observe(this.knowledge.A, this.current),
      B: observe(this.knowledge.B, this.current),
    };
    this.views.clear();
    return result;
  }
}
