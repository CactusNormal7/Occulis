import { describe, expect, it } from "vitest";
import { Board, createGame, provisionalRuleset, startMemory, viewFor } from "@occulis/core";
import { encodeView } from "@occulis/protocol";
import { OFFLINE, type Session, fromMatch, fromQueue } from "./session.js";

function wireView() {
  const { state, knowledge } = startMemory(
    createGame(Board.flat(14, 14), provisionalRuleset(), [
      { id: "a-cmd", kind: "commander", owner: "A", coord: { x: 0, y: 0 } },
      { id: "b-cmd", kind: "commander", owner: "B", coord: { x: 13, y: 13 } },
    ]),
  );
  return encodeView(viewFor(state, knowledge.A));
}

const MATCHED = { kind: "matched", matchId: "m1", player: "A", seat: "jeton-a" } as const;

function seated(): Session {
  return fromQueue(OFFLINE, MATCHED);
}

describe("fromQueue", () => {
  it("passe en attente puis en siège", () => {
    expect(fromQueue(OFFLINE, { kind: "waiting" }).phase).toEqual({ kind: "queued" });
    expect(seated().phase).toEqual({
      kind: "seated",
      matchId: "m1",
      seat: "jeton-a",
      player: "A",
      scenario: undefined,
      rulesetVersion: undefined,
      view: undefined,
    });
  });

  it("retient le code du salon ouvert", () => {
    expect(fromQueue(OFFLINE, { kind: "hosting", code: "ACDEF" }).phase).toEqual({
      kind: "hosting",
      code: "ACDEF",
    });
  });

  it("rapporte un code refusé sans rien asseoir", () => {
    const after = fromQueue(OFFLINE, { kind: "room-fault", fault: { code: "unknown" } });
    expect(after.phase).toEqual({ kind: "room-fault", fault: { code: "unknown" } });
  });

  it("signale un protocole incompatible", () => {
    expect(fromQueue(OFFLINE, { kind: "protocol-mismatch", expected: 7 }).phase).toEqual({
      kind: "outdated",
      expected: 7,
    });
  });
});

describe("fromMatch", () => {
  it("enregistre le camp annoncé par le serveur", () => {
    const after = fromMatch(seated(), {
      kind: "welcome",
      player: "B",
      scenario: "demo-0",
      rulesetVersion: "provisional-0",
    });
    expect(after.phase.kind === "seated" && after.phase.player).toBe("B");
    // La carte est annoncée par le serveur : le client doit dessiner celle sur
    // laquelle le serveur calcule, pas celle qu'il aurait choisie seul.
    expect(after.phase.kind === "seated" && after.phase.scenario).toBe("demo-0");
  });

  it("reconstruit le Set de cases visibles reçu en tableau", () => {
    // Sans décodage, `visible` arriverait en tableau et le rendu croirait le fog vide.
    const after = fromMatch(seated(), { kind: "view", view: wireView() });

    expect(after.phase.kind === "seated" && after.phase.view?.visible).toBeInstanceOf(Set);
    expect(after.phase.kind === "seated" && (after.phase.view?.visible.size ?? 0)).toBeGreaterThan(
      0,
    );
  });

  it("retient un refus sans perdre la vue courante", () => {
    const playing = fromMatch(seated(), { kind: "view", view: wireView() });
    const refused = fromMatch(playing, {
      kind: "rejected",
      error: { code: "not-your-turn", activePlayer: "B" },
    });

    expect(refused.rejection).toEqual({ code: "not-your-turn", activePlayer: "B" });
    expect(refused.phase.kind === "seated" && refused.phase.view).toBeDefined();
  });

  it("efface le refus dès la vue suivante", () => {
    const refused = fromMatch(seated(), {
      kind: "rejected",
      error: { code: "unreachable", to: { x: 0, y: 0 } },
    });
    expect(fromMatch(refused, { kind: "view", view: wireView() }).rejection).toBeUndefined();
  });

  it("ignore un message de partie hors d'une partie", () => {
    expect(fromMatch(OFFLINE, { kind: "view", view: wireView() })).toBe(OFFLINE);
  });
});
