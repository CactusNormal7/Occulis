import { describe, expect, it } from "vitest";
import { decideRequest, decideWatch, pairOf, relationOf, type RelationFacts } from "./relations.js";

const NONE: RelationFacts = {
  exists: true,
  friend: false,
  outgoing: false,
  incoming: false,
  iBlock: false,
  theyBlock: false,
};

describe("pairOf", () => {
  it("range une paire dans le même ordre quel que soit l'ordre d'appel", () => {
    expect(pairOf("b", "a")).toEqual(["a", "b"]);
    expect(pairOf("a", "b")).toEqual(["a", "b"]);
  });
});

describe("relationOf", () => {
  it("ne laisse jamais voir qu'on est bloqué", () => {
    expect(relationOf({ ...NONE, theyBlock: true })).toBe("none");
  });

  it("fait primer son propre blocage", () => {
    expect(relationOf({ ...NONE, iBlock: true, incoming: true })).toBe("blocked");
  });

  it("distingue les deux sens d'une demande", () => {
    expect(relationOf({ ...NONE, incoming: true })).toBe("incoming");
    expect(relationOf({ ...NONE, outgoing: true })).toBe("outgoing");
    expect(relationOf({ ...NONE, friend: true })).toBe("friend");
  });
});

describe("decideRequest", () => {
  it("envoie une demande à un inconnu", () => {
    expect(decideRequest("a", "b", NONE, 0)).toEqual({ ok: true, action: "send" });
  });

  it("accepte directement une demande croisée", () => {
    expect(decideRequest("a", "b", { ...NONE, incoming: true }, 0)).toEqual({
      ok: true,
      action: "accept",
    });
  });

  it("refuse soi-même, un profil sans compte et un ami existant", () => {
    expect(decideRequest("a", "a", NONE, 0)).toEqual({ ok: false, code: "SELF" });
    expect(decideRequest("a", "b", { ...NONE, exists: false }, 0)).toEqual({
      ok: false,
      code: "UNKNOWN_PLAYER",
    });
    expect(decideRequest("a", "b", { ...NONE, friend: true }, 0)).toEqual({
      ok: false,
      code: "ALREADY_FRIENDS",
    });
  });

  it("répond « indisponible » à qui est bloqué, sans nommer le blocage", () => {
    expect(decideRequest("a", "b", { ...NONE, theyBlock: true }, 0)).toEqual({
      ok: false,
      code: "UNAVAILABLE",
    });
    expect(decideRequest("a", "b", { ...NONE, iBlock: true }, 0)).toEqual({
      ok: false,
      code: "BLOCKED",
    });
  });

  it("borne les demandes en attente", () => {
    expect(decideRequest("a", "b", NONE, 50)).toEqual({ ok: false, code: "TOO_MANY_REQUESTS" });
    expect(decideRequest("a", "b", { ...NONE, outgoing: true }, 50)).toEqual({
      ok: true,
      action: "already-sent",
    });
  });
});

describe("decideWatch", () => {
  const ok = { finished: false, player: false, friend: true, allowSpectators: true };

  it("laisse un ami regarder une partie en cours", () => {
    expect(decideWatch(ok)).toBeUndefined();
  });

  it("refuse à un joueur de regarder sa propre partie", () => {
    expect(decideWatch({ ...ok, player: true })).toBe("OWN_MATCH");
  });

  it("refuse un non-ami, un joueur qui refuse les spectateurs et une partie finie", () => {
    expect(decideWatch({ ...ok, friend: false })).toBe("NOT_FRIENDS");
    expect(decideWatch({ ...ok, allowSpectators: false })).toBe("SPECTATORS_REFUSED");
    expect(decideWatch({ ...ok, finished: true })).toBe("MATCH_FINISHED");
  });
});
