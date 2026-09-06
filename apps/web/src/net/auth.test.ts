import { describe, expect, it } from "vitest";
import { authMessage, resetTokenFrom } from "./auth.js";

/**
 * Les deux seules parties décidantes de `net/auth.ts` : le reste n'est que des appels
 * `fetch`. Elles sont pures, donc éprouvables sans serveur.
 */
describe("traduction des refus", () => {
  it("traduit sur le code, pas sur la phrase", () => {
    expect(authMessage(422, { code: "HANDLE_TAKEN", message: "handle-taken" })).toBe(
      "Ce pseudo est déjà pris.",
    );
  });

  it("dit la même chose pour une adresse inconnue et un mot de passe faux", () => {
    // Le serveur ne les distingue pas ; l'interface ne doit pas les distinguer non plus.
    const message = authMessage(401, { code: "INVALID_EMAIL_OR_PASSWORD" });
    expect(message).toBe("Identifiants invalides.");
  });

  it("annonce la limitation de débit sur le statut, qui n'a pas de code", () => {
    expect(authMessage(429, {})).toContain("Trop de tentatives");
  });

  it("retombe sur le message du serveur pour un code inconnu", () => {
    expect(authMessage(400, { code: "QUELQUE_CHOSE_DE_NEUF", message: "Explication brute" })).toBe(
      "Explication brute",
    );
  });
});

describe("jeton de réinitialisation dans l'URL", () => {
  it("le lit quand le lien du courrier ramène ici", () => {
    expect(resetTokenFrom("?reinitialiser=1&token=abc123")).toBe("abc123");
  });

  it("ignore un jeton sans le drapeau, et un drapeau sans jeton", () => {
    expect(resetTokenFrom("?token=abc123")).toBeUndefined();
    expect(resetTokenFrom("?reinitialiser=1")).toBeUndefined();
    expect(resetTokenFrom("")).toBeUndefined();
  });
});
