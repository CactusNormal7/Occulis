/**
 * Où en est le joueur, entre l'arrivée sur la page et une partie en cours.
 *
 * Module pur : ni DOM, ni réseau. Il ne dit pas à quoi ressemble un écran, seulement
 * lequel a lieu d'être — c'est `shell.ts` qui le montre.
 *
 * Il n'existe **aucune partie locale** : le jeu commence quand le serveur assied le
 * joueur, jamais avant (docs/design.md section 2, « pas de local multiplayer »).
 */

/** Ce que le joueur demande à la file : les trois entrées du menu. */
export type Seeking = "quick" | "host" | "join";

export type Stage =
  /** Personne n'est connecté : le formulaire de compte occupe l'écran. */
  | { readonly kind: "auth" }
  /** Connecté : appariement rapide, ouverture d'un salon, entrée par code. */
  | { readonly kind: "menu" }
  /**
   * En attente d'un adversaire. `code` n'apparaît qu'une fois le salon ouvert : il
   * vient du serveur, seul à pouvoir le garantir unique.
   */
  | { readonly kind: "waiting"; readonly seeking: Seeking; readonly code: string | undefined }
  | { readonly kind: "game" };

export type FlowEvent =
  | { readonly kind: "identity"; readonly signedIn: boolean }
  | { readonly kind: "seek"; readonly seeking: Seeking }
  | { readonly kind: "hosting"; readonly code: string }
  | { readonly kind: "seated" }
  /** Retour au menu, à la demande du joueur ou après un refus de la file. */
  | { readonly kind: "menu" };

export const START: Stage = { kind: "auth" };

export function advance(stage: Stage, event: FlowEvent): Stage {
  switch (event.kind) {
    case "identity":
      // Une déconnexion ramène au formulaire d'où que l'on soit, partie comprise :
      // sans session, la file et les parties sont fermées de toute façon.
      if (!event.signedIn) return { kind: "auth" };
      // Une identité confirmée ne doit pas arracher le joueur à ce qu'il fait :
      // elle est aussi rendue à chaque retour du serveur, en pleine partie.
      return stage.kind === "auth" ? { kind: "menu" } : stage;

    case "seek":
      return { kind: "waiting", seeking: event.seeking, code: undefined };

    case "hosting":
      // Un code qui arrive hors de l'attente est un message en retard : l'afficher
      // ferait revenir en arrière un joueur déjà assis.
      if (stage.kind !== "waiting") return stage;
      return { kind: "waiting", seeking: stage.seeking, code: event.code };

    case "seated":
      return { kind: "game" };

    case "menu":
      return stage.kind === "auth" ? stage : { kind: "menu" };
  }
}
