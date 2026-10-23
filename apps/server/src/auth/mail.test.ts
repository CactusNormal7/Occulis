import { afterEach, describe, expect, it, vi } from "vitest";
import {
  changeEmailLetter,
  deleteAccountLetter,
  escapeHtml,
  passwordChangedLetter,
  providerLinkedLetter,
  resetLetter,
  sendLetter,
  verificationLetter,
} from "./mail.js";

const URL = "https://occulis.test/api/auth/verify-email?token=abc&callbackURL=%2F";

describe("courriers", () => {
  const letters = (["en", "fr"] as const).flatMap((locale) => [
    verificationLetter(locale, "a@occulis.test", URL),
    resetLetter(locale, "a@occulis.test", URL),
    changeEmailLetter(locale, "a@occulis.test", "b@occulis.test", URL),
    deleteAccountLetter(locale, "a@occulis.test", URL),
    passwordChangedLetter(locale, "a@occulis.test", URL),
    providerLinkedLetter(locale, "a@occulis.test", "Google", URL),
  ]);

  it("portent le lien en texte comme en HTML, échappé dans le HTML", () => {
    for (const letter of letters) {
      expect(letter.text).toContain(URL);
      expect(letter.html).toContain(escapeHtml(URL));
      expect(letter.html).not.toContain(`href="${URL}"`);
      expect(letter.html.startsWith("<!doctype html>")).toBe(true);
    }
  });

  it("n'emploient que des couleurs opaques, lisibles par tous les clients", () => {
    for (const letter of letters) {
      expect(letter.html).not.toMatch(/rgba?\(|var\(--/);
    }
  });

  it("échappent ce qui vient de l'utilisateur", () => {
    const letter = changeEmailLetter("en", "a@occulis.test", '"><script>x</script>@evil.test', URL);
    expect(letter.html).not.toContain("<script>");
    expect(letter.html).toContain("&lt;script&gt;");
  });

  it("parlent la langue demandée, et la déclarent", () => {
    expect(verificationLetter("en", "a@occulis.test", URL).subject).toBe(
      "Confirm your address — Occulis",
    );
    expect(verificationLetter("fr", "a@occulis.test", URL).subject).toBe(
      "Confirmez votre adresse — Occulis",
    );
    expect(verificationLetter("fr", "a@occulis.test", URL).html).toContain('<html lang="fr">');
    expect(verificationLetter("en", "a@occulis.test", URL).html).toContain("Or copy this link");
  });
});

describe("escapeHtml", () => {
  it("neutralise les cinq caractères significatifs", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });
});

describe("sendLetter sans clé Resend", () => {
  afterEach(() => vi.restoreAllMocks());
  const letter = resetLetter("en", "a@occulis.test", URL);

  it("écrit le courrier dans la console en local, lien compris", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await sendLetter({ MAIL_TO_CONSOLE: "on" } as Env, letter);
    expect(log.mock.calls.join("\n")).toContain(URL);
  });

  it("n'en journalise jamais le corps hors local : il porte un jeton", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await sendLetter({} as Env, letter);
    expect(log).not.toHaveBeenCalled();
    expect(error.mock.calls.join("\n")).not.toContain("token=");
  });
});
