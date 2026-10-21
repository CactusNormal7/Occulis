import { HEARTBEAT } from "@occulis/protocol";
import { retryDelay } from "./backoff.js";

/**
 * Transport WebSocket, reconnexion comprise. Seul module réseau à toucher une API du
 * navigateur : la lecture des messages est un module pur (`session.ts`), pour qu'elle
 * reste testable sans socket.
 */
export interface Channel<TOut> {
  send(message: TOut): void;
  close(): void;
}

/**
 * `unreachable` : la connexion vient d'échouer `FAILURES_BEFORE_UNREACHABLE` fois de suite.
 * Le canal continue d'essayer ; c'est à l'appelant de juger si cela vaut la peine
 * (un refus du serveur et un réseau coupé ont la même apparence vus d'ici).
 */
export type ChannelStatus = "open" | "reconnecting" | "unreachable" | "closed";

const FAILURES_BEFORE_UNREACHABLE = 3;

export interface ChannelOptions<TIn, TOut> {
  /**
   * Relatif : le client est servi par le Worker lui-même, donc de même origine
   * (docs/architecture.md section 4). Seule la future distribution Electron demandera
   * une URL absolue.
   */
  readonly path: string;
  /** Renvoyé à chaque (re)connexion : c'est lui qui fait renvoyer l'état. */
  readonly hello: TOut;
  readonly onMessage: (message: TIn) => void;
  readonly onStatus?: (status: ChannelStatus) => void;
  /**
   * Envoyer le battement de cœur (`HEARTBEAT`) : seule une page de partie le fait, le
   * Durable Object de la partie y répondant sans se réveiller. Ailleurs, chaque `ping`
   * réveillerait son destinataire pour rien.
   */
  readonly heartbeat?: boolean;
}

/**
 * Une coupure n'est pas une fin de partie : le temps de réflexion est illimité
 * (docs/design.md section 2), donc un socket peut tomber en cours de route. Le
 * Durable Object reconstruit l'état depuis le log et renvoie sa vue à chaque
 * `hello` — se reconnecter suffit donc à retrouver la partie, sans protocole de
 * reprise dédié.
 */
export function openChannel<TIn, TOut>(options: ChannelOptions<TIn, TOut>): Channel<TOut> {
  const { path, hello, onMessage, onStatus, heartbeat = false } = options;
  let socket: WebSocket | undefined;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let beat: ReturnType<typeof setInterval> | undefined;
  let abandoned = false;

  const connect = (): void => {
    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    const next = new WebSocket(`${scheme}//${window.location.host}${path}`);
    socket = next;

    next.addEventListener("open", () => {
      attempts = 0;
      onStatus?.("open");
      next.send(JSON.stringify(hello));
      if (heartbeat) beat = setInterval(() => next.send(HEARTBEAT.ping), HEARTBEAT.intervalMs);
    });

    next.addEventListener("message", (event) => {
      if (typeof event.data !== "string" || event.data === HEARTBEAT.pong) return;
      // Une trame illisible est ignorée : la vue suivante remet le client d'aplomb, alors
      // qu'une exception ici ferait taire le gestionnaire sans rien dire.
      let message: TIn;
      try {
        message = JSON.parse(event.data) as TIn;
      } catch {
        return;
      }
      onMessage(message);
    });

    next.addEventListener("close", (event) => {
      clearInterval(beat);
      if (abandoned) return;
      // 4001 = protocole incompatible : réessayer ne ferait que répéter le refus.
      if (event.code === 4001) {
        onStatus?.("closed");
        return;
      }
      attempts += 1;
      onStatus?.(attempts === FAILURES_BEFORE_UNREACHABLE ? "unreachable" : "reconnecting");
      timer = setTimeout(connect, retryDelay(attempts));
    });
  };

  // Une page pré-rendue au survol de son lien (`criticalHead()`) n'est pas encore ouverte :
  // se connecter maintenant annoncerait le joueur sur une page qu'il n'a pas choisie.
  if (document.prerendering === true) {
    document.addEventListener(
      "prerenderingchange",
      () => {
        if (!abandoned) connect();
      },
      { once: true },
    );
  } else {
    connect();
  }

  return {
    // Hors connexion, le message est perdu, pas mis en attente : à la reconnexion, `hello`
    // fait rediffuser l'état, et un coup rejoué à l'aveugle sur une position qui a pu
    // changer serait pire qu'un coup à rejouer. L'appelant le sait par `onStatus`.
    send: (message) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    },
    close: () => {
      abandoned = true;
      if (timer !== undefined) clearTimeout(timer);
      socket?.close();
      onStatus?.("closed");
    },
  };
}
