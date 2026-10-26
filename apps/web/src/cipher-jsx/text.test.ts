import { afterEach, describe, expect, it } from "vitest";
import { dressProps, setTextDress } from "./text.js";

const dress = (text: string, key: number) => `[${key}:${text}]`;

afterEach(() => setTextDress(null));

describe("dressProps", () => {
  it("laisse les props intactes tant qu'aucun chiffre n'est posé", () => {
    const props = { children: "texte" };
    expect(dressProps("p", props)).toBe(props);
  });

  it("chiffre une chaîne enfant et chaque chaîne d'un enfant mixte", () => {
    setTextDress(dress);
    expect(dressProps("p", { children: "texte" })).toEqual({ children: "[0:texte]" });
    expect(dressProps("p", { children: [3, " joueurs", { el: 1 }] })).toEqual({
      children: ["[0:3]", "[1: joueurs]", { el: 1 }],
    });
  });

  it("ne touche ni aux composants, ni aux blancs, ni aux éléments qui exigent du texte", () => {
    setTextDress(dress);
    const component = { children: "texte" };
    expect(dressProps(() => null, component)).toBe(component);
    const gap = { children: "  " };
    expect(dressProps("span", gap)).toBe(gap);
    const option = { children: "joueur" };
    expect(dressProps("option", option)).toBe(option);
  });

  it("ne rechiffre pas les lettres du chiffre lui-même", () => {
    setTextDress(dress);
    const letter = { className: "occ-cipher__letter", children: "a" };
    expect(dressProps("span", letter)).toBe(letter);
  });
});
