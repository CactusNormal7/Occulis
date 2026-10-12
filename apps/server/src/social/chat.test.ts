import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_LENGTH, checkMessage } from "./chat.js";
import { prefixRange } from "./search.js";

describe("checkMessage", () => {
  it("garde le texte et les retours à la ligne, sans les blancs autour", () => {
    expect(checkMessage("  salut\nça va ?  ")).toEqual({ ok: true, body: "salut\nça va ?" });
  });

  it("retire les caractères de contrôle et resserre les lignes vides", () => {
    expect(checkMessage("a\u0007b\r\n\n\n\nc")).toEqual({ ok: true, body: "ab\n\nc" });
  });

  it("refuse un message vide ou trop long", () => {
    expect(checkMessage("   ")).toEqual({ ok: false, code: "MESSAGE_EMPTY" });
    expect(checkMessage(42)).toEqual({ ok: false, code: "MESSAGE_EMPTY" });
    expect(checkMessage("x".repeat(MAX_MESSAGE_LENGTH + 1))).toEqual({ ok: false, code: "MESSAGE_TOO_LONG" });
    expect(checkMessage("é".repeat(MAX_MESSAGE_LENGTH)).ok).toBe(true);
  });
});

describe("prefixRange", () => {
  it("borne la recherche au-dessus du préfixe normalisé", () => {
    expect(prefixRange("  ju ")).toEqual({ from: "ju", to: "ju\u{10FFFF}" });
  });

  it("refuse un préfixe trop court", () => {
    expect(prefixRange("j")).toBeUndefined();
    expect(prefixRange(null)).toBeUndefined();
  });
});
