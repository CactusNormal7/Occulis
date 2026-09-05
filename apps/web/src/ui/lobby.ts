import type { QueueServerMessage } from "@occulis/protocol";
import { PROTOCOL_VERSION } from "@occulis/protocol";
import { type Channel, openChannel } from "../net/channel.js";
import { OFFLINE, type Session, fromQueue } from "../net/session.js";

/**
 * Le bouton qui met en file d'attente, et le compte rendu de ce qui s'y passe.
 *
 * Provisoire, comme la saisie de coups : il n'existe aucun design system
 * (docs/design.md 8.1). C'est un moyen de jouer en ligne la logique déjà
 * implémentée, pas une décision d'interface.
 */
export interface LobbyElements {
  readonly button: HTMLButtonElement;
  readonly leave: HTMLButtonElement;
  readonly status: HTMLElement;
}

export interface LobbyOptions {
  readonly elements: LobbyElements;
  readonly onSeated: (matchId: string, seat: string) => void;
  /** Retour à la démonstration hot-seat, la partie en ligne étant abandonnée. */
  readonly onLeave: () => void;
}

export function attachLobby(options: LobbyOptions): void {
  const { button, leave, status } = options.elements;
  let channel: Channel<unknown> | undefined;
  let session: Session = OFFLINE;

  const receive = (message: QueueServerMessage): void => {
    session = fromQueue(session, message);
    const phase = session.phase;

    if (phase.kind === "queued") {
      status.textContent = "En attente d'un adversaire…";
      return;
    }
    if (phase.kind === "outdated") {
      status.textContent = `Client trop ancien : le serveur attend le protocole ${phase.expected}.`;
      button.disabled = false;
      return;
    }
    if (phase.kind === "seated") {
      status.textContent = `Partie trouvée · vous jouez ${phase.player ?? "?"}.`;
      channel?.close();
      leave.hidden = false;
      options.onSeated(phase.matchId, phase.seat);
    }
  };

  leave.hidden = true;
  leave.addEventListener("click", () => {
    session = OFFLINE;
    leave.hidden = true;
    button.disabled = false;
    status.textContent = "";
    options.onLeave();
  });

  button.addEventListener("click", () => {
    button.disabled = true;
    status.textContent = "Connexion…";
    channel = openChannel<QueueServerMessage, { kind: "hello"; protocol: number }>({
      // L'identité vient du cookie de session, résolue par le Worker : rien à annoncer.
      path: "/api/queue",
      hello: { kind: "hello", protocol: PROTOCOL_VERSION },
      onMessage: receive,
      onStatus: (state) => {
        if (state === "reconnecting") status.textContent = "Connexion perdue, reprise…";
      },
    });
  });
}
