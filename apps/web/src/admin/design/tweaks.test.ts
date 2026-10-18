import { describe, expect, it } from "vitest";
import { THEMES, type Palette } from "@occulis/ui/tokens";
import { editedCount, fromHex, paletteEntries, paletteSource, toHex, withEntry } from "./tweaks.js";

const obsidian: Palette = THEMES.obsidian;
// Une couleur d'un autre thème : aucune valeur en dur, même dans un test (règle ESLint).
const other = THEMES.reliquary.camp.A;
const otherBackground = THEMES.reliquary.background;

describe("palette retouchée", () => {
  it("énumère chaque couleur par son chemin, dans l'ordre de la déclaration", () => {
    const paths = paletteEntries(obsidian).map((entry) => entry.path);
    expect(paths.slice(0, 4)).toEqual(["background", "surface", "ink", "terrain.top"]);
    expect(paths).toContain("camp.B");
    expect(paths).toContain("sky.aura");
  });

  it("remplace une couleur sans toucher aux autres ni à l'original", () => {
    const edited = withEntry(obsidian, "camp.A", other);
    expect(edited.camp.A).toBe(other);
    expect(edited.camp.B).toBe(obsidian.camp.B);
    expect(obsidian.camp.A).not.toBe(other);
    expect(editedCount(edited, obsidian)).toBe(1);
    expect(withEntry(obsidian, "camp.C", 1)).toEqual(obsidian);
  });

  it("passe du format du sélecteur aux entiers, et retour", () => {
    expect(toHex(other)).toMatch(/^#[0-9a-f]{6}$/);
    expect(toHex(otherBackground).length).toBe(7);
    expect(fromHex(toHex(other).toUpperCase())).toBe(other);
    expect(fromHex("bleu")).toBeUndefined();
  });

  it("s'écrit comme une entrée de THEMES", () => {
    const text = paletteSource("obsidian", withEntry(obsidian, "background", otherBackground));
    expect(text.split("\n")[0]).toBe("  obsidian: {");
    expect(text).toContain(`    background: 0x${otherBackground.toString(16).padStart(6, "0")},`);
    expect(text).toMatch(/ {4}camp: \{ A: 0x[0-9a-f]{6}, B: 0x[0-9a-f]{6} \},/);
    expect(text.endsWith("  },")).toBe(true);
  });
});
