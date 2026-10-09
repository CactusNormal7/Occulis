import { describe, expect, it } from "vitest";
import {
  arrivalMessage,
  asBoardFrames,
  canUnlink,
  describeMyResult,
  handleCooldownLabel,
  parseProfileRoute,
  profileHash,
  sinceLabel,
} from "./model.js";

describe("routes du profil", () => {
  it("fait l'aller-retour entre route et fragment", () => {
    for (const route of [
      { view: "account" },
      { view: "matches", offset: 0 },
      { view: "matches", offset: 25 },
      { view: "match", id: "abc-123" },
    ] as const) {
      expect(parseProfileRoute(profileHash(route))).toEqual(route);
    }
  });

  it("garde l'ancre de sécurité sur la vue du compte", () => {
    expect(parseProfileRoute("#securite")).toEqual({ view: "account" });
    expect(parseProfileRoute("")).toEqual({ view: "account" });
  });

  it("refuse un identifiant de partie suspect et un décalage négatif", () => {
    expect(parseProfileRoute("#/parties/<script>")).toEqual({ view: "matches", offset: 0 });
    expect(parseProfileRoute("#/parties?offset=-5")).toEqual({ view: "matches", offset: 0 });
  });
});

describe("messages d'arrivée", () => {
  it("accueille un compte créé par Google", () => {
    expect(arrivalMessage("?bienvenue=1")?.text).toContain("changer");
  });

  it("confirme une liaison et explique un refus", () => {
    expect(arrivalMessage("?lie=google")).toEqual({ ok: true, text: "Google est lié à votre compte." });
    expect(arrivalMessage("?error=email_doesn't_match")?.ok).toBe(false);
    expect(arrivalMessage("")).toBeUndefined();
  });
});

describe("ce que le compte permet", () => {
  it("annonce le délai de pseudo, puis se tait", () => {
    const now = Date.UTC(2026, 9, 9);
    expect(handleCooldownLabel({ nextHandleChangeAt: now + 86_400_000 }, now)).toContain("Prochain changement");
    expect(handleCooldownLabel({ nextHandleChangeAt: null }, now)).toBeUndefined();
    expect(handleCooldownLabel({ nextHandleChangeAt: now - 1 }, now)).toBeUndefined();
  });

  it("ne laisse pas délier la seule méthode de connexion", () => {
    expect(canUnlink({ hasPassword: false, providers: ["google"] }, "google")).toBe(false);
    expect(canUnlink({ hasPassword: true, providers: ["google"] }, "google")).toBe(true);
    expect(canUnlink({ hasPassword: true, providers: [] }, "google")).toBe(false);
  });
});

describe("parties", () => {
  it("nomme le résultat du point de vue du joueur", () => {
    const resignation = { kind: "victory", winner: "A", reason: "resignation" } as const;
    expect(describeMyResult({ result: "won", outcome: resignation })).toBe("victoire par abandon");
    expect(describeMyResult({ result: "lost", outcome: resignation })).toBe("défaite par abandon");
    expect(describeMyResult({ result: "ongoing", outcome: null })).toBe("en cours");
  });

  it("ne prête au plateau que la ligne de vue de son camp", () => {
    const frames = asBoardFrames([{ pieces: [], ghosts: [], visible: ["1,1"] }], "B");
    expect(frames[0]?.visible).toEqual({ A: [], B: ["1,1"] });
  });

  it("dit depuis quand une session n'a pas servi", () => {
    const now = 10 * 86_400_000;
    expect(sinceLabel(now, now)).toBe("à l'instant");
    expect(sinceLabel(now - 30 * 60_000, now)).toBe("il y a 30 min");
    expect(sinceLabel(now - 5 * 3_600_000, now)).toBe("il y a 5 h");
    expect(sinceLabel(now - 3 * 86_400_000, now)).toBe("il y a 3 j");
  });
});
