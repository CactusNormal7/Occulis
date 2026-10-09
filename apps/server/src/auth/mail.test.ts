import { describe, expect, it } from "vitest";
import {
  changeEmailLetter,
  deleteAccountLetter,
  escapeHtml,
  passwordChangedLetter,
  providerLinkedLetter,
  resetLetter,
  verificationLetter,
} from "./mail.js";

const URL = "https://occulis.test/api/auth/verify-email?token=abc&callbackURL=%2F";

describe("courriers", () => {
  const letters = [
    verificationLetter("a@occulis.test", URL),
    resetLetter("a@occulis.test", URL),
    changeEmailLetter("a@occulis.test", "b@occulis.test", URL),
    deleteAccountLetter("a@occulis.test", URL),
    passwordChangedLetter("a@occulis.test", URL),
    providerLinkedLetter("a@occulis.test", "Google", URL),
  ];

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
    const letter = changeEmailLetter("a@occulis.test", '"><script>x</script>@evil.test', URL);
    expect(letter.html).not.toContain("<script>");
    expect(letter.html).toContain("&lt;script&gt;");
  });
});

describe("escapeHtml", () => {
  it("neutralise les cinq caractères significatifs", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });
});
