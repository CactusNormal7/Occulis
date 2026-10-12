import { SELF, env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { QueueIntent, QueueServerMessage } from "@occulis/protocol";
import { PROTOCOL_VERSION } from "@occulis/protocol";
import { signUp, unique } from "./test-helpers.js";
import { ACCEPT_MS } from "./proposals.js";

/**
 * L'appariement dans workerd. Le mono-threading du Durable Object global est ce qui
 * écarte le double appariement (docs/architecture.md section 2) : ça ne se vérifie que
 * dans le vrai runtime, un test unitaire ne pouvant qu'éprouver la file en mémoire.
 */
async function connect(cookie: string) {
  const response = await SELF.fetch("https://occulis.test/api/queue", {
    headers: { Upgrade: "websocket", Cookie: cookie },
  });
  expect(response.status).toBe(101);

  const socket = response.webSocket;
  if (socket === null) throw new Error("pas de WebSocket dans la réponse");
  socket.accept();

  const received: QueueServerMessage[] = [];
  const pending: ((message: QueueServerMessage) => void)[] = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as QueueServerMessage;
    received.push(message);
    for (const wake of pending.splice(0)) wake(message);
  });

  /** Attend le premier message d'un genre donné, déjà reçu ou non. */
  const awaiting = (kind: QueueServerMessage["kind"]) =>
    new Promise<QueueServerMessage>((resolve, reject) => {
      const found = received.find((message) => message.kind === kind);
      if (found !== undefined) return resolve(found);

      const deadline = setTimeout(() => reject(new Error(`aucun « ${kind} »`)), 3000);
      const listen = (message: QueueServerMessage): void => {
        if (message.kind !== kind) {
          pending.push(listen);
          return;
        }
        clearTimeout(deadline);
        resolve(message);
      };
      pending.push(listen);
    });

  const hello = (intent: QueueIntent): void => {
    socket.send(JSON.stringify({ kind: "hello", protocol: PROTOCOL_VERSION, intent }));
  };

  /** Répond à la proposition reçue. */
  const answer = async (kind: "accept" | "decline"): Promise<void> => {
    const proposal = await awaiting("proposal");
    if (proposal.kind !== "proposal") throw new Error("aucune proposition");
    socket.send(JSON.stringify({ kind, proposalId: proposal.proposalId }));
  };

  return { socket, hello, awaiting, answer };
}

describe("QueueDO dans workerd", () => {
  it("apparie deux joueurs sur une même partie, chacun sur son siège", async () => {
    const anne = await connect(await signUp(unique("anne")));
    const boris = await connect(await signUp(unique("boris")));
    anne.hello({ kind: "quick" });
    boris.hello({ kind: "quick" });

    // Rien n'est créé avant que les deux aient accepté.
    const proposal = await anne.awaiting("proposal");
    if (proposal.kind !== "proposal") throw new Error("aucune proposition");
    expect(proposal.remainingMs).toBeGreaterThan(0);
    expect(proposal.remainingMs).toBeLessThanOrEqual(ACCEPT_MS);
    await anne.answer("accept");
    const update = await boris.awaiting("proposal-update");
    expect(update.kind === "proposal-update" && update.accepted).toEqual({ self: false, opponent: true });
    await boris.answer("accept");

    const [forAnne, forBoris] = await Promise.all([
      anne.awaiting("matched"),
      boris.awaiting("matched"),
    ]);
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

  it("remet en tête de file qui avait accepté, et sort qui a refusé", async () => {
    const anne = await connect(await signUp(unique("anne")));
    const boris = await connect(await signUp(unique("boris")));
    anne.hello({ kind: "quick" });
    boris.hello({ kind: "quick" });

    await anne.answer("accept");
    await boris.answer("decline");

    const [forAnne, forBoris] = await Promise.all([anne.awaiting("proposal-lapsed"), boris.awaiting("proposal-lapsed")]);
    expect(forAnne).toEqual({ kind: "proposal-lapsed", requeued: true });
    expect(forBoris).toEqual({ kind: "proposal-lapsed", requeued: false });

    // Anne attend de nouveau, en tête : le prochain venu lui est proposé.
    const carla = await connect(await signUp(unique("carla")));
    carla.hello({ kind: "quick" });
    expect((await carla.awaiting("proposal")).kind).toBe("proposal");

    anne.socket.close();
    boris.socket.close();
    carla.socket.close();
  });

  it("fait tomber une proposition quand une connexion se ferme", async () => {
    const anne = await connect(await signUp(unique("anne")));
    const boris = await connect(await signUp(unique("boris")));
    anne.hello({ kind: "quick" });
    boris.hello({ kind: "quick" });

    await anne.answer("accept");
    await boris.awaiting("proposal");
    boris.socket.close();

    expect(await anne.awaiting("proposal-lapsed")).toEqual({ kind: "proposal-lapsed", requeued: true });
    anne.socket.close();
  });

  it("sort de la file, à l'échéance, qui n'a pas répondu", async () => {
    const anne = await connect(await signUp(unique("anne")));
    const boris = await connect(await signUp(unique("boris")));
    anne.hello({ kind: "quick" });
    boris.hello({ kind: "quick" });
    await anne.answer("accept");
    await boris.awaiting("proposal");

    // Le temps ne s'avance pas dans workerd : on avance l'échéance elle-même.
    const queue = env.QUEUE.get(env.QUEUE.idFromName("global"));
    await runInDurableObject(queue, async (_instance, state) => {
      const proposals = (await state.storage.get<{ deadline: number }[]>("proposals")) ?? [];
      await state.storage.put("proposals", proposals.map((proposal) => ({ ...proposal, deadline: 0 })));
    });
    expect(await runDurableObjectAlarm(queue)).toBe(true);

    expect(await anne.awaiting("proposal-lapsed")).toEqual({ kind: "proposal-lapsed", requeued: true });
    expect(await boris.awaiting("proposal-lapsed")).toEqual({ kind: "proposal-lapsed", requeued: false });

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

  it("apparie l'hôte d'un salon privé et le joueur qui en saisit le code", async () => {
    const hote = await connect(await signUp(unique("hote")));
    hote.hello({ kind: "host" });

    const hosting = await hote.awaiting("hosting");
    if (hosting.kind !== "hosting") throw new Error("aucun salon");
    expect(hosting.code).toHaveLength(5);

    const invite = await connect(await signUp(unique("invite")));
    // La casse et les espaces d'une saisie manuelle ne doivent pas coûter la partie.
    invite.hello({ kind: "join", code: ` ${hosting.code.toLowerCase()} ` });

    const [forHote, forInvite] = await Promise.all([
      hote.awaiting("matched"),
      invite.awaiting("matched"),
    ]);
    if (forHote.kind !== "matched" || forInvite.kind !== "matched") throw new Error("non apparié");

    expect(forHote.matchId).toBe(forInvite.matchId);
    // L'hôte tient le camp A, l'arrivant le camp B.
    expect(forHote.player).toBe("A");
    expect(forInvite.player).toBe("B");

    // Le salon est consommé : un troisième joueur ne peut plus s'y asseoir.
    const tard = await connect(await signUp(unique("tard")));
    tard.hello({ kind: "join", code: hosting.code });
    const fault = await tard.awaiting("room-fault");
    if (fault.kind !== "room-fault") throw new Error("salon encore ouvert");
    expect(fault.fault.code).toBe("unknown");

    hote.socket.close();
    invite.socket.close();
    tard.socket.close();
  });

  it("refuse un code inconnu et son propre code", async () => {
    const seul = await connect(await signUp(unique("seul")));
    seul.hello({ kind: "join", code: "AAAAA" });

    const inconnu = await seul.awaiting("room-fault");
    if (inconnu.kind !== "room-fault") throw new Error("pas de refus");
    expect(inconnu.fault.code).toBe("unknown");

    // Deux connexions du même compte : c'est la situation réelle, un second onglet
    // qui saisit le code que le premier vient d'afficher.
    const cookie = await signUp(unique("encore"));
    const premier = await connect(cookie);
    premier.hello({ kind: "host" });
    const hosting = await premier.awaiting("hosting");
    if (hosting.kind !== "hosting") throw new Error("aucun salon");

    const second = await connect(cookie);
    second.hello({ kind: "join", code: hosting.code });
    const sien = await second.awaiting("room-fault");
    if (sien.kind !== "room-fault") throw new Error("pas de refus");
    expect(sien.fault.code).toBe("own");

    seul.socket.close();
    premier.socket.close();
    second.socket.close();
  });
});
