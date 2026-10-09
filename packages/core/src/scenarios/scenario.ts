import type { Board } from "../board.js";
import type { Piece } from "../pieces/index.js";
import type { Deployment } from "../team.js";

/**
 * Une position de départ, référencée par son nom.
 *
 * Vit dans `core` pour la même raison que le roster (docs/implementation-notes #12) :
 * le client dessine la carte sur laquelle le serveur calcule, et deux définitions
 * séparées finiraient par diverger — le client afficherait alors un plateau qui n'est
 * pas celui de la partie. Ce n'est pas du contenu acté pour autant.
 *
 * `board` est une fabrique et non une valeur : `Board` est immuable, mais rien ne doit
 * faire dépendre deux parties d'une même instance partagée.
 */
export interface Scenario {
  readonly name: string;
  readonly board: () => Board;
  /**
   * La position de départ fixe, pour une carte sans déploiement. Vide pour une carte qui
   * en a un : ce sont alors les équipes des joueurs qui la remplissent.
   */
  readonly pieces: readonly Piece[];
  /** Les zones et équipes par défaut ; absent pour une carte à position fixe (`demo-0`). */
  readonly deployment?: Deployment;
}
