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

export type ChannelStatus = "open" | "reconnecting" | "closed";

export interface ChannelOptions<TIn, TOut> {
  /**
   * Relatif : le client est servi par le Worker lui-même, donc de même origine
   * (docs/architecture.md section 4). Seule la future distribution Electron demandera
   * une URL absolue.
   */
  readonly path: string;
  /** Renvoyé à chaque (re)connexion : c'est lui qui fait rediffuser l'état. */
  readonly hello: TOut;
  readonly onMessage: (message: TIn) => void;
  readonly onStatus?: (status: ChannelStatus) => void;
}

/**
 * Une coupure n'est pas une fin de partie : le temps de réflexion est illimité
 * (docs/design.md section 2), donc un socket peut tomber en cours de route. Le
 * Durable Object reconstruit l'état depuis le log et rediffuse les vues à chaque
 * `hello` — se reconnecter suffit donc à retrouver la partie, sans protocole de
 * reprise dédié.
 */
export function openChannel<TIn, TOut>(options: ChannelOptions<TIn, TOut>): Channel<TOut> {
  const { path, hello, onMessage, onStatus } = options;
  let socket: WebSocket | undefined;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abandoned = false;

  const connect = (): void => {
    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    const next = new WebSocket(`${scheme}//${window.location.host}${path}`);
    socket = next;

    next.addEventListener("open", () => {
      attempts = 0;
      onStatus?.("open");
      next.send(JSON.stringify(hello));
    });

    next.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      onMessage(JSON.parse(event.data) as TIn);
    });

    next.addEventListener("close", (event) => {
      if (abandoned) return;
      // 4001 = protocole incompatible : réessayer ne ferait que répéter le refus.
      if (event.code === 4001) {
        onStatus?.("closed");
        return;
      }
      attempts += 1;
      onStatus?.("reconnecting");
      timer = setTimeout(connect, retryDelay(attempts));
    });
  };

  connect();

  return {
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
