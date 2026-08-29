import type { Coord } from "../coord.js";

export type PlayerId = "A" | "B";

export function opponentOf(player: PlayerId): PlayerId {
  return player === "A" ? "B" : "A";
}

export type PieceId = string;

/** Identifiant de type de pièce. Le roster reste à définir (docs/design.md point ouvert 12). */
export type PieceKind = string;

/**
 * Une pièce *en jeu* : identité, camp et position, rien d'autre.
 *
 * C'est délibérément un enregistrement de données et non une instance de classe.
 * Le comportement d'un type de pièce vit dans `PieceType` (voir `piece-type.ts`),
 * qui est partagé par toutes les pièces d'un même `kind` : une pièce ne porte donc
 * jamais ses propres règles. Deux raisons, toutes deux structurantes :
 *
 *  - cet objet traverse le réseau tel quel (`fog.ts` — `PlayerView`) et doit rester
 *    sérialisable en JSON sans perte ;
 *  - l'état de partie est reconstruit en rejouant le log d'actions
 *    (docs/architecture.md section 3), ce qui suppose des données inertes d'un
 *    côté et des règles versionnées de l'autre (`Ruleset`), jamais les deux mêlées.
 */
export interface Piece {
  readonly id: PieceId;
  readonly kind: PieceKind;
  readonly owner: PlayerId;
  readonly coord: Coord;
}
