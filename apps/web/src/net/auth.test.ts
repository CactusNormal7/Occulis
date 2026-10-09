import { describe, expect, it } from "vitest";
import { authMessage, redirectMessage } from "./auth.js";

/**
 * Les seules parties décidantes de `net/auth.ts` : le reste n'est que des appels
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
    expect(message).toBe("Adresse ou mot de passe incorrect.");
  });

  it("annonce un compte suspendu par le back-office", () => {
    expect(authMessage(403, { code: "BANNED_USER" })).toBe("Ce compte est suspendu.");
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

describe("refus portés par une redirection", () => {
  it("explique les retours de Google et des liens expirés", () => {
    expect(redirectMessage("access_denied")).toBe("Connexion Google annulée.");
    expect(redirectMessage("INVALID_TOKEN")).toContain("plus valable");
    expect(redirectMessage("jamais-vu")).toContain("Réessayez");
  });

  it("distingue le délai de pseudo de la limitation de débit", () => {
    expect(authMessage(429, { code: "HANDLE_COOLDOWN" })).toContain("une fois par mois");
  });

  it("annonce un mot de passe ayant fuité", () => {
    expect(authMessage(400, { code: "PASSWORD_COMPROMISED" })).toContain("fuites");
  });
});
