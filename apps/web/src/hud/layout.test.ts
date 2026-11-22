import { describe, expect, it } from "vitest";
import { hudInsets } from "./layout.js";

describe("hudInsets", () => {
  it("réserve la colonne de droite sur un écran large", () => {
    expect(hudInsets({ x: 1440 })).toMatchObject({ right: 312, left: 64, top: 88 });
  });

  it("la réserve en bas sur un écran étroit, où la colonne se replie", () => {
    const narrow = hudInsets({ x: 800 });
    expect(narrow.right).toBe(0);
    expect(narrow.bottom).toBeGreaterThan(hudInsets({ x: 1440 }).bottom);
  });
});

describe("hudInsets, colonne repliée", () => {
  it("rend au plateau la place de la colonne sur un écran large", () => {
    expect(hudInsets({ x: 1440 }, false).right).toBe(16);
  });

  it("rend au plateau la place de la fiche en bas sur un écran étroit", () => {
    expect(hudInsets({ x: 800 }, false).bottom).toBeLessThan(hudInsets({ x: 800 }).bottom);
  });
});
