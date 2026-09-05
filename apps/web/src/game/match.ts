import {
  type Action,
  type ActionError,
  type Board,
  type Coord,
  type GameState,
  type MatchMemory,
  type Piece,
  type PlayerId,
  type PlayerView,
  type Result,
  advanceMemory,
  pieceAt,
  startMemory,
  viewFor,
} from "@occulis/core";

/**
 * Ce dont le rendu et l'interface ont besoin d'une partie, qu'elle soit jouée en
 * local ou arbitrée par le serveur.
 *
 * L'écart entre les deux est réel et assumé : en hot-seat `state` est la position
 * exacte, en ligne c'est l'hypothèse reconstruite depuis la vue du joueur
 * (`hypothesis.ts`), forcément optimiste. Le rendu n'a pas à connaître la différence
 * — c'est le serveur qui arbitre, et `play` peut échouer dans les deux cas.
 */
export interface MatchSurface {
  readonly board: Board;
  readonly state: GameState;
  readonly activePlayer: PlayerId;
  readonly isOver: boolean;
  pieceAt(coord: Coord): Piece | undefined;
  viewFor(player: PlayerId): PlayerView;
  play(action: Action): Result<GameState, ActionError>;
}

/**
 * Une partie jouée en local, avec la mémoire de chaque joueur.
 *
 * Module pur : ni Pixi, ni DOM. Il tient ce que le Durable Object tient — l'état réel
 * et les deux `PlayerKnowledge` — et n'expose vers le rendu que des `PlayerView`
 * (docs/architecture.md section 2).
 */
export class Match implements MatchSurface {
  private memory: MatchMemory;
  /**
   * `Scene` ne redessine que si la vue a changé d'identité : les vues doivent donc
   * être stables entre deux actions, et recalculées une seule fois après chacune.
   */
  private views = new Map<PlayerId, PlayerView>();

  constructor(state: GameState) {
    this.memory = startMemory(state);
  }

  get state(): GameState {
    return this.memory.state;
  }

  get board(): Board {
    return this.memory.state.board;
  }

  get activePlayer(): PlayerId {
    return this.memory.state.activePlayer;
  }

  get isOver(): boolean {
    return this.memory.state.outcome !== null;
  }

  pieceAt(coord: Coord): Piece | undefined {
    return pieceAt(this.memory.state, coord);
  }

  viewFor(player: PlayerId): PlayerView {
    const cached = this.views.get(player);
    if (cached !== undefined) return cached;

    const view = viewFor(this.memory.state, this.memory.knowledge[player]);
    this.views.set(player, view);
    return view;
  }

  /** Applique une action ; l'état ne bouge pas si elle est refusée. */
  play(action: Action): Result<GameState, ActionError> {
    const advanced = advanceMemory(this.memory, action);
    if (!advanced.ok) return advanced;

    this.memory = advanced.value;
    this.views.clear();
    return { ok: true, value: advanced.value.state };
  }
}
