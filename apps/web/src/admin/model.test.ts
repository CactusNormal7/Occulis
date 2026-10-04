import { describe, expect, it } from "vitest";
import type { AdminMatchSummary } from "@occulis/protocol";
import {
  banDuration,
  describeAction,
  describeBan,
  describeResult,
  formatDate,
  pageLabel,
  parseRoute,
  routeHash,
  sectionOf,
  type Route,
} from "./model.js";

describe("routes du back-office", () => {
  it("retombe sur la vue d'ensemble", () => {
    expect(parseRoute("")).toEqual({ view: "overview" });
    expect(parseRoute("#/n-importe-quoi")).toEqual({ view: "overview" });
  });

  it("lit les listes, leurs filtres et leurs fiches", () => {
    expect(parseRoute("#/users?q=anne&offset=25")).toEqual({ view: "users", search: "anne", offset: 25 });
    expect(parseRoute("#/users/u-1")).toEqual({ view: "user", id: "u-1" });
    expect(parseRoute("#/matches?status=ongoing")).toEqual({ view: "matches", status: "ongoing", offset: 0 });
    expect(parseRoute("#/matches?status=autre&offset=-3")).toEqual({ view: "matches", status: null, offset: 0 });
    expect(parseRoute("#/players/p-1")).toEqual({ view: "player", id: "p-1" });
  });

  it("refait l'URL qu'elle a lue", () => {
    const routes: Route[] = [
      { view: "overview" },
      { view: "users", search: "a b", offset: 50 },
      { view: "users", search: "", offset: 0 },
      { view: "user", id: "u/1" },
      { view: "matches", status: "finished", offset: 25 },
      { view: "match", id: "m-1" },
      { view: "player", id: "p-1" },
    ];
    for (const route of routes) expect(parseRoute(routeHash(route))).toEqual(route);
  });

  it("range une fiche sous sa liste", () => {
    expect(sectionOf({ view: "player", id: "p" })).toBe("users");
    expect(sectionOf({ view: "match", id: "m" })).toBe("matches");
  });
});

describe("mise en mots", () => {
  const match: AdminMatchSummary = {
    id: "m",
    playerA: { id: "a", handle: "anne" },
    playerB: { id: "b", handle: "bruno" },
    rulesetVersion: "v",
    scenario: "s",
    startedAt: 0,
    finishedAt: null,
    outcome: null,
    actions: 0,
  };

  it("nomme le vainqueur par son siège", () => {
    expect(describeResult(match)).toBe("en cours");
    expect(
      describeResult({ ...match, outcome: { kind: "victory", winner: "B", reason: "resignation" } }),
    ).toBe("victoire de bruno (abandon)");
  });

  it("décrit un coup", () => {
    expect(describeAction({ kind: "resign" })).toBe("abandon");
    expect(describeAction({ kind: "move", pieceId: "A-scout-1", to: { x: 2, y: 5 } })).toBe("A-scout-1 → 2,5");
  });

  it("formate les deux représentations de date", () => {
    const local = new Date(2026, 0, 2, 3, 4);
    expect(formatDate(local.getTime())).toBe("2026-01-02 03:04");
    expect(formatDate(local.toISOString())).toBe("2026-01-02 03:04");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("pas une date")).toBe("—");
  });

  it("annonce une page", () => {
    expect(pageLabel(25, 25, 132)).toBe("26–50 sur 132");
    expect(pageLabel(0, 0, 0)).toBe("aucun résultat");
  });

  it("décrit une suspension", () => {
    expect(describeBan({ banned: false })).toBe("actif");
    expect(describeBan({ banned: true, banReason: "triche" })).toBe("suspendu définitivement — triche");
  });
});

describe("durée de suspension", () => {
  it("lit des jours, et rien comme définitif", () => {
    expect(banDuration("")).toEqual({ ok: true, seconds: undefined });
    expect(banDuration("1")).toEqual({ ok: true, seconds: 86_400 });
    expect(banDuration("0,5")).toEqual({ ok: true, seconds: 43_200 });
  });

  it("refuse une valeur illisible plutôt que de la lire comme définitive", () => {
    expect(banDuration("abc")).toEqual({ ok: false });
    expect(banDuration("0")).toEqual({ ok: false });
    expect(banDuration("-2")).toEqual({ ok: false });
  });
});
