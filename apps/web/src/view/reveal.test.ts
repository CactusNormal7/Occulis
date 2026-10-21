import { describe, expect, it } from "vitest";
import type { CoordKey, PlayerView } from "@occulis/core";
import { awaitsMove, crestAt, lightAt, litTiles, relight, settling } from "./reveal.js";

const timing = { revealMs: 400, revealPerTileMs: 50, dimMs: 300, dimPerTileMs: 10 };
const keys = ["0,0", "1,0", "4,0"] as CoordKey[];

describe("relight", () => {
  it("déploie la vue depuis la pièce qui voit : la case la plus loin s'éclaire en dernier", () => {
    const map = relight(undefined, keys, new Set(keys), [{ x: 0, y: 0 }], 0, timing);
    expect(lightAt(map, "0,0" as CoordKey, 0)).toBe(0);
    expect(lightAt(map, "0,0" as CoordKey, 400)).toBe(1);
    // À 300 ms, la case à une distance est plus éclairée que celle à quatre.
    expect(lightAt(map, "1,0" as CoordKey, 300)).toBeGreaterThan(
      lightAt(map, "4,0" as CoordKey, 300),
    );
    expect(lightAt(map, "4,0" as CoordKey, 600)).toBe(1);
    expect(settling(map, 500)).toBe(true);
    expect(settling(map, 10_000)).toBe(false);
  });

  it("repart de l'éclairage courant quand la vue change en pleine transition", () => {
    const lit = relight(undefined, keys, new Set(keys), [{ x: 0, y: 0 }], 0, timing);
    const middle = lightAt(lit, "0,0" as CoordKey, 200);
    const dimmed = relight(lit, keys, new Set(), [{ x: 0, y: 0 }], 200, timing);
    expect(lightAt(dimmed, "0,0" as CoordKey, 200)).toBeCloseTo(middle);
    expect(lightAt(dimmed, "0,0" as CoordKey, 10_000)).toBe(0);
  });

  it("laisse intacte une case dont la cible ne change pas", () => {
    const first = relight(undefined, keys, new Set(["0,0" as CoordKey]), [], 0, timing);
    const second = relight(first, keys, new Set(["0,0" as CoordKey]), [], 5000, timing);
    expect(second.get("0,0" as CoordKey)).toBe(first.get("0,0" as CoordKey));
  });

  it("ne fait luire que le front d'une case qui s'éclaire", () => {
    const map = relight(undefined, keys, new Set(keys), [{ x: 0, y: 0 }], 0, timing);
    expect(crestAt(map, "0,0" as CoordKey, 200)).toBeCloseTo(1);
    expect(crestAt(map, "0,0" as CoordKey, 400)).toBe(0);
    const dark = relight(map, keys, new Set(), [], 1000, timing);
    expect(crestAt(dark, "0,0" as CoordKey, 1100)).toBe(0);
  });
});

describe("litTiles et awaitsMove", () => {
  // Le protocole transmet `outcome: null` tant que la partie dure : une comparaison à
  // `undefined` laissait le plateau entièrement éteint et la pulsation du tour muette.
  const view: PlayerView = {
    player: "A",
    activePlayer: "A",
    turn: 3,
    outcome: null,
    legalActions: [],
    visible: new Set(keys),
    ownPieces: [],
    visibleEnemies: [],
    ghosts: [],
  };
  const finished: PlayerView = {
    ...view,
    outcome: { kind: "victory", winner: "B", reason: "resignation" },
  };

  it("éclaire les cases en vue tant que la partie dure", () => {
    expect([...litTiles(view)]).toEqual(keys);
  });

  it("n'éclaire plus rien une fois la partie finie", () => {
    expect(litTiles(finished).size).toBe(0);
  });

  it("dit qu'un coup est attendu seulement au trait et en cours de partie", () => {
    expect(awaitsMove(view)).toBe(true);
    expect(awaitsMove({ ...view, activePlayer: "B" })).toBe(false);
    expect(awaitsMove(finished)).toBe(false);
  });
});
