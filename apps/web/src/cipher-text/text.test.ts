// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { acceptsDress, currentDress, isDressable, setTextDress } from "./text.js";

afterEach(() => setTextDress(null));

describe("chiffre des textes", () => {
  it("ne pose aucun habit tant qu'on ne le demande pas", () => {
    expect(currentDress()).toBeNull();
    const dress = { mount: () => undefined, update: () => undefined, unmount: () => undefined };
    setTextDress(dress);
    expect(currentDress()).toBe(dress);
  });

  it("ne chiffre que les textes qui ne sont pas des blancs", () => {
    expect(isDressable("3 joueurs")).toBe(true);
    expect(isDressable("  ")).toBe(false);
    expect(isDressable("")).toBe(false);
  });

  it("épargne les éléments qui exigent du texte et ceux du chiffre lui-même", () => {
    expect(acceptsDress(document.createElement("p"))).toBe(true);
    expect(acceptsDress(document.createElement("option"))).toBe(false);
    expect(acceptsDress(document.createElement("textarea"))).toBe(false);

    const cipher = document.createElement("span");
    cipher.className = "occ-cipher";
    const letter = document.createElement("span");
    letter.className = "occ-cipher__letter";
    cipher.append(letter);
    expect(acceptsDress(letter)).toBe(false);
  });
});
