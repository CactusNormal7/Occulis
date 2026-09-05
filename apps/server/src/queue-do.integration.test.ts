import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { QueueServerMessage } from "@occulis/protocol";
import { PROTOCOL_VERSION } from "@occulis/protocol";
import { signUp, unique } from "./auth/auth.integration.test.js";

/**
 * L'appariement dans workerd. Le mono-threading du Durable Object global est ce qui
 * écarte le double appariement (docs/architecture.md section 2) : ça ne se vérifie que
 * dans le vrai runtime, un test unitaire ne pouvant qu'éprouver la file en mémoire.
 */
async function enqueue(cookie: string) {
  const response = await SELF.fetch("https://occulis.test/api/queue", {
    headers: { Upgrade: "websocket", Cookie: cookie },
  });
  expect(response.status).toBe(101);

  const socket = response.webSocket;
  if (socket === null) throw new Error("pas de WebSocket dans la réponse");
  socket.accept();

  const matched = new Promise<QueueServerMessage>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error("aucun appariement")), 3000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as QueueServerMessage;
      if (message.kind !== "matched") return;
      clearTimeout(deadline);
      resolve(message);
    });
  });

  socket.send(JSON.stringify({ kind: "hello", protocol: PROTOCOL_VERSION }));
  return { socket, matched };
}

describe("QueueDO dans workerd", () => {
  it("apparie deux joueurs sur une même partie, chacun sur son siège", async () => {
    const anne = await enqueue(await signUp(unique("anne")));
    const boris = await enqueue(await signUp(unique("boris")));

    const [forAnne, forBoris] = await Promise.all([anne.matched, boris.matched]);
    if (forAnne.kind !== "matched" || forBoris.kind !== "matched") throw new Error("non apparié");

    expect(forAnne.matchId).toBe(forBoris.matchId);
    expect([forAnne.player, forBoris.player].sort()).toEqual(["A", "B"]);
    expect(forAnne.seat).not.toBe(forBoris.seat);

    // La partie appariée est réellement joignable avec le jeton reçu.
    const joined = await SELF.fetch(
      `https://occulis.test/match/${forAnne.matchId}?seat=${forAnne.seat}`,
      { headers: { Upgrade: "websocket" } },
    );
    expect(joined.status).toBe(101);
    joined.webSocket?.accept();
    joined.webSocket?.close();

    anne.socket.close();
    boris.socket.close();
  });

  it("refuse une mise en file sans session", async () => {
    // L'identité passée au Durable Object vient du cookie, jamais de la requête :
    // sans session, il n'y a personne à inscrire.
    const anonymous = await SELF.fetch("https://occulis.test/api/queue", {
      headers: { Upgrade: "websocket" },
    });
    expect(anonymous.status).toBe(401);

    const forged = await SELF.fetch("https://occulis.test/api/queue?player=quelquun-dautre", {
      headers: { Upgrade: "websocket" },
    });
    expect(forged.status).toBe(401);
  });
});
