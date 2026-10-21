import { describe, expect, it } from "vitest";
import {
  parseAction,
  parseClientMessage,
  parseQueueClientMessage,
  parseSocialClientMessage,
} from "./parse.js";

const wire = (value: unknown) => JSON.stringify(value);

describe("parseAction", () => {
  it("reconstruit un coup sans rien reprendre d'autre", () => {
    const action = parseAction({
      kind: "move",
      pieceId: "a-4",
      to: { x: 1, y: 5, z: 9 },
      extra: "x",
    });
    expect(action).toEqual({ kind: "move", pieceId: "a-4", to: { x: 1, y: 5 } });
    expect(JSON.stringify(action)).toBe('{"kind":"move","pieceId":"a-4","to":{"x":1,"y":5}}');
  });

  it("refuse des coordonnées qui ne sont pas des entiers", () => {
    // `coordKey` les confondrait avec de vrais entiers, et le log les rejouerait telles quelles.
    for (const to of [
      { x: "1", y: "5" },
      { x: 1.5, y: 5 },
      { x: 1 },
      { x: 1, y: Number.MAX_VALUE },
      null,
      [1, 5],
    ]) {
      expect(parseAction({ kind: "move", pieceId: "a-4", to })).toBeUndefined();
    }
  });

  it("refuse une pièce sans identifiant lisible", () => {
    for (const pieceId of [undefined, "", 4, "x".repeat(200)]) {
      expect(parseAction({ kind: "move", pieceId, to: { x: 1, y: 5 } })).toBeUndefined();
    }
  });

  it("n'écoute jamais le client sur qui abandonne", () => {
    expect(parseAction({ kind: "resign", player: "B" })).toEqual({ kind: "resign" });
  });

  it("refuse un genre d'action inconnu", () => {
    expect(parseAction({ kind: "capture", pieceId: "a-4" })).toBeUndefined();
    expect(parseAction("move")).toBeUndefined();
  });
});

describe("parseClientMessage", () => {
  it("lit les trois genres de message", () => {
    expect(parseClientMessage(wire({ kind: "hello", protocol: 6 }))).toEqual({
      kind: "hello",
      protocol: 6,
    });
    expect(parseClientMessage(wire({ kind: "action", action: { kind: "resign" } }))).toEqual({
      kind: "action",
      action: { kind: "resign" },
    });
    expect(
      parseClientMessage(
        wire({ kind: "deploy", team: [{ kind: "scout", coord: { x: 0, y: 1 } }] }),
      ),
    ).toEqual({
      kind: "deploy",
      team: [{ kind: "scout", coord: { x: 0, y: 1 } }],
    });
  });

  it("garde un déploiement à l'équipe illisible, pour qu'il soit refusé en clair", () => {
    expect(parseClientMessage(wire({ kind: "deploy", team: "tout" }))).toEqual({
      kind: "deploy",
      team: undefined,
    });
  });

  it("rend undefined pour ce qui n'est pas un message", () => {
    for (const raw of [
      "",
      "{",
      "null",
      "[]",
      "42",
      wire({ kind: "hello", protocol: "6" }),
      wire({ kind: "chat" }),
    ]) {
      expect(parseClientMessage(raw)).toBeUndefined();
    }
    expect(
      parseClientMessage(
        wire({ kind: "action", action: { kind: "move", pieceId: "a-4", to: { x: "1", y: 5 } } }),
      ),
    ).toBeUndefined();
  });
});

describe("parseQueueClientMessage", () => {
  it("lit les trois intentions et les réponses à une proposition", () => {
    for (const intent of [{ kind: "quick" }, { kind: "host" }, { kind: "join", code: "ab-cd" }]) {
      expect(parseQueueClientMessage(wire({ kind: "hello", protocol: 6, intent }))).toEqual({
        kind: "hello",
        protocol: 6,
        intent,
      });
    }
    expect(parseQueueClientMessage(wire({ kind: "accept", proposalId: "p-1" }))).toEqual({
      kind: "accept",
      proposalId: "p-1",
    });
    expect(parseQueueClientMessage(wire({ kind: "decline", proposalId: "p-1" }))).toEqual({
      kind: "decline",
      proposalId: "p-1",
    });
  });

  it("refuse une intention absente ou un code de salon qui n'est pas du texte", () => {
    expect(parseQueueClientMessage(wire({ kind: "hello", protocol: 6 }))).toBeUndefined();
    expect(
      parseQueueClientMessage(
        wire({ kind: "hello", protocol: 6, intent: { kind: "join", code: 42 } }),
      ),
    ).toBeUndefined();
    expect(parseQueueClientMessage(wire({ kind: "accept" }))).toBeUndefined();
  });
});

describe("parseSocialClientMessage", () => {
  it("ne lit que hello", () => {
    expect(parseSocialClientMessage(wire({ kind: "hello", protocol: 6 }))).toEqual({
      kind: "hello",
      protocol: 6,
    });
    expect(parseSocialClientMessage(wire({ kind: "challenge" }))).toBeUndefined();
  });
});
