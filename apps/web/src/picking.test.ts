import { describe, expect, it } from "vitest";
import { Board } from "@occulis/core";
import { type IsoProjection, project } from "./iso.js";
import { tileAt } from "./picking.js";

function projection(overrides: Partial<IsoProjection> = {}): IsoProjection {
  return {
    tileWidth: 72,
    tileHeight: 36,
    heightUnit: 22,
    scale: 1,
    rotation: 0,
    pivot: { x: 1, y: 1 },
    ...overrides,
  };
}

const FLAT = Board.fromAscii(["000", "000", "000"]);
/** Une butte de hauteur 2 au centre, qui masque la case arrière. */
const MOUND = Board.fromAscii(["000", "020", "000"]);

describe("tileAt", () => {
  it("retrouve chaque case depuis son propre centre, à tout angle et toute échelle", () => {
    for (const proj of [
      projection(),
      projection({ rotation: 0.6 }),
      projection({ rotation: -2.1, scale: 1.8 }),
      projection({ rotation: Math.PI, scale: 0.5 }),
    ]) {
      for (const tile of FLAT.allTiles()) {
        expect(tileAt(project(tile.coord, tile.height, proj), FLAT, proj)).toEqual(tile.coord);
      }
    }
  });

  it("désigne le relief au premier plan plutôt que la case qu'il masque", () => {
    const proj = projection();
    // Le centre projeté de (0,0) tombe sous la face supérieure de la butte.
    expect(tileAt(project({ x: 0, y: 0 }, 0, proj), MOUND, proj)).toEqual({ x: 1, y: 1 });
  });

  it("désigne la case par sa falaise, pas seulement par son sommet", () => {
    const proj = projection();
    const summit = project({ x: 1, y: 1 }, 2, proj);
    // Un point situé sous le sommet, dans la hauteur de la face verticale.
    expect(tileAt({ x: summit.x, y: summit.y + 30 }, MOUND, proj)).toEqual({ x: 1, y: 1 });
  });

  it("ne désigne rien hors du plateau", () => {
    expect(tileAt({ x: 10_000, y: 10_000 }, FLAT, projection())).toBeUndefined();
  });
});
