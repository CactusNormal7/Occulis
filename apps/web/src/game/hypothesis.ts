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
 * son `PlayerView`, et c'est tout l'intérêt du fog of war (CLAUDE.md). Or désigner une
 * case au clic demande un `GameState`. D'où cet état d'hypothèse : ses propres pièces,
 * les adverses réellement visibles, rien d'autre.
 *
 * Il ne sert plus qu'à **la géométrie** — quelle pièce occupe telle case, à qui
 * appartient-elle. La légalité d'un coup ne s'en déduit plus : elle arrive du serveur
 * dans `PlayerView.legalActions`, précisément parce qu'une hypothèse ne peut pas la
 * calculer juste.
 *
 * Elle reste fausse dans les deux sens — cases occupées crues libres, menaces cachées
 * ignorées, attaquants crus libres de passer là où une pièce invisible les bloque.
 * C'est pourquoi rien de décisif ne doit en être tiré.
 *
 * Les fantômes sont exclus : un souvenir peut être périmé, et l'ériger en obstacle
 * masquerait des coups réellement jouables (docs/implementation-notes #16).
 */
export function hypothesisFrom(view: PlayerView, board: Board, ruleset: Ruleset): GameState {
  const pieces: Piece[] = [...view.ownPieces, ...view.visibleEnemies];
  const start = createGame(board, ruleset, pieces, view.activePlayer);
  return { ...start, turn: view.turn, outcome: view.outcome };
}
