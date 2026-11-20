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
