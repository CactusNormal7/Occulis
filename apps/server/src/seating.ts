import type { PlayerId } from "@occulis/core";
import type { SeatDenial } from "@occulis/protocol";

/**
 * Jetons de siège : un par camp, tirés à la création de la partie.
 *
 * Le squelette n'a pas d'authentification (docs/setup.md section 7), et jusqu'ici
 * un client annonçait simplement `?player=A` : n'importe qui pouvait donc s'asseoir
 * à la place de n'importe qui, et surtout **lire la vue de l'adversaire**. Le fog of
 * war doit être structurel — un client ne peut pas recevoir ce que le serveur ne lui
 * envoie pas (CLAUDE.md) — ce qui suppose de savoir à qui on parle.
 *
 * Ce n'est pas de l'authentification : ça n'identifie personne, ça lie une connexion
 * à un siège. Un compte reste à construire par-dessus.
 */
export interface Seats {
  readonly A: string;
  readonly B: string;
}

export function seatFor(seats: Seats, token: string | null): PlayerId | undefined {
  if (token === null || token.length === 0) return undefined;
  if (token === seats.A) return "A";
  if (token === seats.B) return "B";
  return undefined;
}

/**
 * Seul le joueur au trait peut agir.
 *
 * `core` modélise déjà l'abandon comme une action du joueur au trait — le vainqueur
 * y est `opponentOf(activePlayer)`. Accepter une action hors tour couronnerait donc
 * le mauvais camp, et laisserait un joueur jouer les pièces de l'autre : `core`
 * vérifie que la pièce appartient au joueur au trait, pas que l'expéditeur est ce
 * joueur-là. C'est le serveur qui tient cette moitié de la règle.
 */
export function denyOutOfTurn(activePlayer: PlayerId, seat: PlayerId): SeatDenial | undefined {
  return seat === activePlayer ? undefined : { code: "not-your-turn", activePlayer };
}
