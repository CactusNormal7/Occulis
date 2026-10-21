/**
 * Où en est le joueur, entre l'arrivée sur la page et une partie en cours.
 *
 * Module pur : ni DOM, ni réseau. Il ne dit pas à quoi ressemble un écran, seulement
 * lequel a lieu d'être — c'est `shell.ts` qui le montre.
 *
 * Il n'existe **aucune partie locale** : le jeu commence quand le serveur assied le
 * joueur, jamais avant (docs/design.md section 2, « pas de local multiplayer »).
 */

/**
 * Ce que le joueur attend : les trois entrées de la file, la réponse d'un ami défié,
 * ou l'ouverture de la partie d'un ami qu'il va regarder.
 */
export type Seeking = QueueSeeking | "challenge" | "watch";

/** Les trois entrées du menu qui passent par la file d'attente. */
export type QueueSeeking = "quick" | "host" | "join";

export type Stage =
  /**
   * L'identité n'est pas encore revenue du serveur. Ni formulaire ni menu : montrer l'un
   * des deux avant de savoir ferait apparaître puis disparaître un écran.
   */
  | { readonly kind: "boot" }
  /** Personne n'est connecté : le formulaire de compte occupe l'écran. */
  | { readonly kind: "auth" }
  /** Connecté : appariement rapide, ouverture d'un salon, entrée par code. */
  | { readonly kind: "menu" }
  /**
   * En attente d'un adversaire. `code` n'apparaît qu'une fois le salon ouvert : il
   * vient du serveur, seul à pouvoir le garantir unique.
   */
  | {
      readonly kind: "waiting";
      readonly seeking: Seeking;
      readonly code: string | undefined;
      /** L'ami défié ou regardé, pour le nommer pendant l'attente. */
      readonly friend?: string | undefined;
    }
  /** File rapide : un adversaire est trouvé, la fenêtre d'acceptation est ouverte. */
  | { readonly kind: "proposal" }
  /** Assis, la partie se déploie : annonce de l'adversaire, puis composition de l'équipe. */
  | { readonly kind: "deploying" }
  /** En partie — assis à un siège, ou spectateur (`spectating`) du camp d'un ami. */
  | { readonly kind: "game"; readonly spectating?: true | undefined }
  /** Les équipes préparées d'avance, depuis le menu. */
  | { readonly kind: "teams" };

export type FlowEvent =
  | { readonly kind: "identity"; readonly signedIn: boolean }
  | { readonly kind: "seek"; readonly seeking: Seeking; readonly friend?: string | undefined }
  | { readonly kind: "hosting"; readonly code: string }
  | { readonly kind: "proposed" }
  /** La proposition est tombée ; `requeued` : le joueur avait accepté, il attend de nouveau. */
  | { readonly kind: "lapsed"; readonly requeued: boolean }
  | { readonly kind: "deploying" }
  | { readonly kind: "seated"; readonly spectating?: boolean | undefined }
  | { readonly kind: "teams" }
  /** Retour au menu, à la demande du joueur ou après un refus de la file. */
  | { readonly kind: "menu" };

export const START: Stage = { kind: "boot" };

export function advance(stage: Stage, event: FlowEvent): Stage {
  switch (event.kind) {
    case "identity":
      // Une déconnexion ramène au formulaire d'où que l'on soit, partie comprise :
      // sans session, la file et les parties sont fermées de toute façon.
      if (!event.signedIn) return { kind: "auth" };
      // Une identité confirmée ne doit pas arracher le joueur à ce qu'il fait :
      // elle est aussi rendue à chaque retour du serveur, en pleine partie.
      return stage.kind === "auth" || stage.kind === "boot" ? { kind: "menu" } : stage;

    case "seek":
      return { kind: "waiting", seeking: event.seeking, code: undefined, friend: event.friend };

    case "hosting":
      // Un code qui arrive hors de l'attente est un message en retard : l'afficher
      // ferait revenir en arrière un joueur déjà assis.
      if (stage.kind !== "waiting") return stage;
      return { ...stage, code: event.code };

    case "proposed":
      // Une proposition ne concerne que la file rapide ; arrivée ailleurs, elle est en retard.
      return stage.kind === "waiting" && stage.seeking === "quick" ? { kind: "proposal" } : stage;

    case "lapsed":
      if (stage.kind !== "proposal" && stage.kind !== "waiting") return stage;
      return event.requeued
        ? { kind: "waiting", seeking: "quick", code: undefined }
        : { kind: "menu" };

    case "deploying":
      return stage.kind === "boot" || stage.kind === "auth" || stage.kind === "game"
        ? stage
        : { kind: "deploying" };

    case "seated":
      return event.spectating === true ? { kind: "game", spectating: true } : { kind: "game" };

    case "teams":
      return stage.kind === "menu" ? { kind: "teams" } : stage;

    case "menu":
      return stage.kind === "boot" || stage.kind === "auth" ? stage : { kind: "menu" };
  }
}
