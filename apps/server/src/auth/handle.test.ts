import { describe, expect, it } from "vitest";
import { MAX_HANDLE_LENGTH, anonymousHandle, checkHandle, handleCandidates } from "./handle.js";

describe("validation du pseudo", () => {
  it("normalise avant de mesurer", () => {
    expect(checkHandle("  Jules   Besson ")).toEqual({ ok: true, handle: "Jules Besson" });
    // Pleine chasse : la même chaîne qu'en ASCII après NFKC, donc la même collision.
    expect(checkHandle("ｊｕｌｅｓ")).toEqual({ ok: true, handle: "jules" });
  });

  it("borne la longueur en caractères, pas en octets", () => {
    expect(checkHandle("a")).toEqual({ ok: false, code: "HANDLE_LENGTH" });
    expect(checkHandle("x".repeat(MAX_HANDLE_LENGTH + 1))).toEqual({ ok: false, code: "HANDLE_LENGTH" });
    expect(checkHandle("é".repeat(MAX_HANDLE_LENGTH)).ok).toBe(true);
    expect(checkHandle(42)).toEqual({ ok: false, code: "HANDLE_LENGTH" });
  });

  it("accepte les écritures non latines", () => {
    expect(checkHandle("Сергей").ok).toBe(true);
    expect(checkHandle("山田太郎").ok).toBe(true);
  });

  it("refuse les caractères invisibles et de direction", () => {
    expect(checkHandle("ab‮cd")).toEqual({ ok: false, code: "HANDLE_CHARSET" });
    expect(checkHandle("ab​cd")).toEqual({ ok: false, code: "HANDLE_CHARSET" });
    expect(checkHandle("ab\u0000cd")).toEqual({ ok: false, code: "HANDLE_CHARSET" });
  });

  it("refuse symboles, emoji et diacritiques empilés", () => {
    expect(checkHandle("<script>")).toEqual({ ok: false, code: "HANDLE_CHARSET" });
    expect(checkHandle("roi👑")).toEqual({ ok: false, code: "HANDLE_CHARSET" });
    expect(checkHandle("zá̂̃lgo")).toEqual({ ok: false, code: "HANDLE_CHARSET" });
  });

  it("réserve les noms d'équipe sous toutes leurs formes", () => {
    expect(checkHandle("Admin")).toEqual({ ok: false, code: "HANDLE_RESERVED" });
    expect(checkHandle("Mod-érateur")).toEqual({ ok: false, code: "HANDLE_RESERVED" });
    expect(checkHandle("O.C.C.U.L.I.S")).toEqual({ ok: false, code: "HANDLE_RESERVED" });
    expect(checkHandle("Supprimé-123")).toEqual({ ok: false, code: "HANDLE_RESERVED" });
    expect(checkHandle("administré").ok).toBe(true);
  });
});

describe("pseudo dérivé d'un fournisseur d'identité", () => {
  const random = (): string => "q7x2";

  it("reprend le nom affiché, puis le numérote, puis l'aléa", () => {
    const candidates = handleCandidates("Jules Besson", random);
    expect(candidates[0]).toBe("Jules Besson");
    expect(candidates[1]).toBe("Jules Besson-2");
    expect(candidates.at(-1)).toBe("Jules Besson-q7x2");
  });

  it("nettoie ce que la validation refuserait", () => {
    expect(handleCandidates("👑 Roi‮ Jules", random)[0]).toBe("Roi Jules");
  });

  it("laisse la place du suffixe à un nom trop long", () => {
    for (const candidate of handleCandidates("x".repeat(80), random)) {
      expect(checkHandle(candidate).ok).toBe(true);
    }
  });

  it("se rabat sur un nom générique quand rien ne reste ou que le nom est réservé", () => {
    expect(handleCandidates("👑👑", random)[0]).toBe("joueur");
    expect(handleCandidates("", random)[0]).toBe("joueur");
    expect(handleCandidates("Admin", random)[0]).toBe("joueur");
  });
});

describe("profil anonymisé", () => {
  it("ne peut pas être pris par un joueur", () => {
    const handle = anonymousHandle("0d6c1e7a-1234-4b2c-9f00-aa11bb22cc33");
    expect(handle).toBe("supprimé-0d6c1e7a1234");
    expect(checkHandle(handle).ok).toBe(false);
  });
});
