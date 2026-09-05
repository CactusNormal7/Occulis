import {
  type Board,
  type GameState,
  type Piece,
  type PlayerView,
  type Ruleset,
  createGame,
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
 * Conséquence à assumer : **l'hypothèse est optimiste**. Ignorant les pièces hors
 * LOS, elle croit libres des cases occupées et ne voit pas les menaces cachées —
 * or sous la règle « échecs strict » une menace invisible rend un coup illégal. Le
 * client propose donc un sur-ensemble des coups légaux, et le serveur en refuse
 * certains. C'est le bon sens de l'erreur : mieux vaut un refus expliqué qu'un coup
 * légal escamoté. `ServerMessage.rejected` existe pour ça.
 *
 * Les fantômes sont exclus : un souvenir peut être périmé, et l'ériger en obstacle
 * masquerait des coups réellement jouables (docs/implementation-notes #16).
 */
export function hypothesisFrom(view: PlayerView, board: Board, ruleset: Ruleset): GameState {
  const pieces: Piece[] = [...view.ownPieces, ...view.visibleEnemies];
  const start = createGame(board, ruleset, pieces, view.activePlayer);
  return { ...start, turn: view.turn, outcome: view.outcome };
}
