import { describe, expect, it } from "vitest";
import type { Coord, Piece } from "@occulis/core";
import { parseCommand, toAction } from "./command.js";

interface Move {
  from: Coord;
  to: Coord;
}

function expectMove(input: string): Move {
  const parsed = parseCommand(input);
  if (!parsed.ok) throw new Error(`commande refusée : ${parsed.error.code}`);
  if (parsed.value.kind !== "move") throw new Error("commande de déplacement attendue");
  const { from, to } = parsed.value;
  return { from, to };
}

function faultOf(input: string): string {
  const parsed = parseCommand(input);
  if (parsed.ok) throw new Error(`commande acceptée à tort : ${input}`);
  return parsed.error.code;
}

describe("parseCommand", () => {
  it("lit un déplacement", () => {
    expect(expectMove("1,6 2,5")).toEqual({ from: { x: 1, y: 6 }, to: { x: 2, y: 5 } });
  });

  it("accepte les séparateurs et les espaces superflus", () => {
    const expected = { from: { x: 1, y: 6 }, to: { x: 2, y: 5 } };
    expect(expectMove("  1, 6   ->  2 , 5 ")).toEqual(expected);
    expect(expectMove("1,6 > 2,5")).toEqual(expected);
  });

  it("lit un abandon", () => {
    const parsed = parseCommand("abandon");
    expect(parsed.ok && parsed.value.kind).toBe("resign");
  });

  it("rejette une saisie incomplète ou illisible", () => {
    expect(faultOf("")).toBe("empty");
    expect(faultOf("1,6")).toBe("missing-destination");
    expect(faultOf("depart 2,5")).toBe("bad-coord");
    expect(faultOf("1,6 2,5 3,4")).toBe("trailing");
  });

  it("accepte des coordonnées négatives, que la validation refusera plus loin", () => {
    expect(expectMove("-1,-2 0,0").from).toEqual({ x: -1, y: -2 });
  });
});

describe("toAction", () => {
  const scout: Piece = { id: "a-scout", kind: "scout", owner: "A", coord: { x: 1, y: 6 } };
  const enemy: Piece = { id: "b-scout", kind: "scout", owner: "B", coord: { x: 3, y: 5 } };
  const board = new Map([
    ["1,6", scout],
    ["3,5", enemy],
  ]);
  const pieceAt = (coord: Coord): Piece | undefined => board.get(`${coord.x},${coord.y}`);

  function actionFor(input: string) {
    const parsed = parseCommand(input);
    if (!parsed.ok) throw new Error(`commande refusée : ${parsed.error.code}`);
    return toAction(parsed.value, pieceAt);
  }

  it("résout la case de départ en identifiant de pièce", () => {
    const action = actionFor("1,6 2,5");
    expect(action.ok && action.value).toEqual({
      kind: "move",
      pieceId: "a-scout",
      to: { x: 2, y: 5 },
    });
  });

  it("refuse une case de départ vide", () => {
    const action = actionFor("0,0 1,1");
    expect(!action.ok && action.error).toEqual({ code: "no-piece-here", coord: { x: 0, y: 0 } });
  });
});
