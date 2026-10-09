import { describe, expect, it } from "vitest";
import { arrivalNotice, cleanedSearch, fieldOf, passwordHint, pathOf, routeOf } from "./model.js";

describe("parcours de compte", () => {
  it("donne à chaque parcours son URL, aller et retour", () => {
    for (const kind of ["signin", "register", "forgot"] as const) {
      expect(routeOf(pathOf(kind), "")).toEqual({ kind });
    }
    expect(routeOf("/inscription/", "")).toEqual({ kind: "register" });
  });

  it("montre la connexion par défaut, y compris à la racine", () => {
    expect(routeOf("/", "")).toEqual({ kind: "signin" });
    expect(routeOf("/n-importe-quoi", "")).toEqual({ kind: "signin" });
  });

  it("lit le jeton de réinitialisation que ramène le lien du courrier", () => {
    expect(routeOf("/reinitialiser", "?token=abc123")).toEqual({ kind: "reset", token: "abc123" });
    expect(routeOf("/reinitialiser", "?token=")).toEqual({ kind: "reset", token: undefined });
    expect(routeOf("/reinitialiser", "")).toEqual({ kind: "reset", token: undefined });
  });
});

describe("retour de redirection", () => {
  it("annonce une adresse confirmée, et un compte supprimé", () => {
    expect(arrivalNotice("/", "?verifiee=1")).toMatchObject({ tone: "success" });
    expect(arrivalNotice("/connexion", "?supprime=1")?.text).toContain("supprimé");
  });

  it("propose de redemander un lien expiré, du bon type", () => {
    expect(arrivalNotice("/reinitialiser", "?error=INVALID_TOKEN")).toMatchObject({ tone: "error", retry: "reset" });
    expect(arrivalNotice("/", "?error=TOKEN_EXPIRED")).toMatchObject({ tone: "error", retry: "verification" });
  });

  it("explique un refus de liaison Google", () => {
    expect(arrivalNotice("/connexion", "?error=account_not_linked")?.text).toContain("jamais été confirmée");
    expect(arrivalNotice("/connexion", "?error=access_denied")?.text).toBe("Connexion Google annulée.");
    expect(arrivalNotice("/connexion", "?error=inedit")?.text).toContain("Réessayez");
  });

  it("ne dit rien sans paramètre de retour", () => {
    expect(arrivalNotice("/", "")).toBeUndefined();
  });

  it("retire jeton et erreurs de l'URL, et garde le reste", () => {
    expect(cleanedSearch("?token=secret&error=x&verifiee=1&supprime=1")).toBe("");
    expect(cleanedSearch("?token=secret&autre=1")).toBe("?autre=1");
  });
});

describe("refus rattachés à leur champ", () => {
  it("place chaque code sous le bon champ", () => {
    expect(fieldOf("HANDLE_TAKEN")).toBe("handle");
    expect(fieldOf("PASSWORD_COMPROMISED")).toBe("password");
    expect(fieldOf("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")).toBe("email");
    // Identifiants faux : aucun champ en particulier, pour ne pas dire lequel.
    expect(fieldOf("INVALID_EMAIL_OR_PASSWORD")).toBeUndefined();
    expect(fieldOf(undefined)).toBeUndefined();
  });
});

describe("indication de longueur", () => {
  it("compte ce qui manque, puis se tait", () => {
    expect(passwordHint("")).toContain("10 caractères");
    expect(passwordHint("abcdefghi")).toBe("Encore 1 caractère.");
    expect(passwordHint("abcdef")).toBe("Encore 4 caractères.");
    expect(passwordHint("abcdefghij")).toBe("Longueur suffisante.");
  });
});
