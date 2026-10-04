import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, parseMatchFilter, parsePage, validHandle } from "./paging.js";

describe("pagination du back-office", () => {
  it("prend des valeurs par défaut", () => {
    expect(parsePage(new URLSearchParams())).toEqual({ limit: DEFAULT_PAGE_SIZE, offset: 0 });
  });

  it("borne la taille de page et refuse un décalage négatif", () => {
    expect(parsePage(new URLSearchParams("limit=100000&offset=-4"))).toEqual({
      limit: MAX_PAGE_SIZE,
      offset: 0,
    });
    expect(parsePage(new URLSearchParams("limit=0")).limit).toBe(1);
  });

  it("ignore une valeur illisible", () => {
    expect(parsePage(new URLSearchParams("limit=abc&offset=x"))).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
  });

  it("ne retient qu'un statut connu", () => {
    expect(parseMatchFilter(new URLSearchParams("status=ongoing")).status).toBe("ongoing");
    expect(parseMatchFilter(new URLSearchParams("status=n'importe")).status).toBeNull();
    expect(parseMatchFilter(new URLSearchParams("player=")).player).toBeNull();
    expect(parseMatchFilter(new URLSearchParams("player=p1")).player).toBe("p1");
  });
});

describe("validation du pseudo", () => {
  it("applique les bornes de l'inscription", () => {
    expect(validHandle("  ab  ")).toBe("ab");
    expect(validHandle("a")).toBeUndefined();
    expect(validHandle("x".repeat(33))).toBeUndefined();
    expect(validHandle(42)).toBeUndefined();
  });
});
