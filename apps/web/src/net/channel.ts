/**
 * Transport WebSocket, réduit au strict nécessaire. Seul module réseau à toucher
 * une API du navigateur : la lecture des messages est un module pur (`session.ts`),
 * pour qu'elle reste testable sans socket.
 */
export interface Channel<TOut> {
  send(message: TOut): void;
  close(): void;
}

/**
 * `path` est relatif : sur le web, le client est servi par le Worker lui-même, donc
 * de même origine (docs/architecture.md section 4). Seule la future distribution
 * Electron demandera une URL absolue, injectée au build.
 */
export function openChannel<TIn, TOut>(
  path: string,
  hello: TOut,
  onMessage: (message: TIn) => void,
): Channel<TOut> {
  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${scheme}//${window.location.host}${path}`);

  socket.addEventListener("open", () => socket.send(JSON.stringify(hello)));
  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    onMessage(JSON.parse(event.data) as TIn);
  });

  return {
    send: (message) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    },
    close: () => socket.close(),
  };
}
