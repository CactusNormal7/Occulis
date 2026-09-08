import {
  type Action,
  type ActionError,
  type Board,
  type GameState,
  type Piece,
  type PlayerView,
  type Result,
  type Ruleset,
  applyAction,
  createGame,
  ok,
} from "@occulis/core";

/**
 * La position telle que le joueur peut la croire, reconstruite depuis sa seule vue.
 *
 * En ligne, le client **n'a pas** la position réelle : le serveur ne lui envoie que
 * son `PlayerView`, et c'est tout l'intérêt du fog of war (CLAUDE.md). Or la
 * sélection au clic et l'affichage des destinations passent par `legalActions`, qui
 * demande un `GameState`. D'où cet état d'hypothèse : ses propres pièces, les
 * adverses réellement visibles, rien d'autre.
 *
 * Conséquence à assumer : **l'hypothèse est fausse, et dans les deux sens**. Ignorant
 * les pièces hors LOS, elle croit libres des cases occupées et ne voit pas les
 * menaces cachées — sous « échecs strict » une menace invisible rend un coup illégal,
 * donc le client propose des coups que le serveur refuse. Symétriquement, une pièce
 * cachée qui *bloquait* la route d'un attaquant visible n'y figure pas, donc le
 * client peut voir une menace qui n'existe pas et refuser un coup licite. Dans les
 * deux cas le serveur arbitre, et `ServerMessage.rejected` porte sa réponse.
 *
 * Les fantômes sont exclus : un souvenir peut être périmé, et l'ériger en obstacle
 * masquerait des coups réellement jouables (docs/implementation-notes #16).
 */
export function hypothesisFrom(view: PlayerView, board: Board, ruleset: Ruleset): GameState {
  const pieces: Piece[] = [...view.ownPieces, ...view.visibleEnemies];
  const start = createGame(board, ruleset, pieces, view.activePlayer);
  return { ...start, turn: view.turn, outcome: view.outcome };
}

/**
 * Joue un coup sur une hypothèse **sans rien conclure sur la fin de partie**.
 *
 * `applyAction` adjuge : il constate qu'un camp n'a plus de pièce maîtresse et
 * proclame la victoire de l'autre. Sur une hypothèse c'est faux par construction —
 * la maîtresse adverse est presque toujours cachée par le fog, donc le camp d'en
 * face y paraît **toujours** décapité. Le client se déclarait ainsi vainqueur au
 * premier coup joué, puis se retrouvait gelé : `legalActions` d'une partie terminée
 * est vide, donc plus aucune pièce n'était sélectionnable ni déplaçable.
 *
 * La fin de partie appartient au serveur, seul à voir les deux camps. L'anticipation
 * ne sert qu'à ne pas figer l'affichage pendant l'aller-retour réseau : elle déplace
 * les pièces et passe le trait, rien de plus.
 */
export function anticipate(
  hypothesis: GameState,
  action: Action,
): Result<GameState, ActionError> {
  const applied = applyAction(hypothesis, action);
  if (!applied.ok) return applied;
  return ok({ ...applied.value, outcome: hypothesis.outcome });
}
