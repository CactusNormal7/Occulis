import { describe, expect, it } from "vitest";
import { Board } from "@occulis/core";
import type { AdminFrame, AdminMatchDetail } from "@occulis/protocol";
import { METRICS } from "../theme.js";
import { QUARTER_TURN, tileQuad } from "../view/iso.js";
import { centerOffset, clampFrame, describeEntry, fitScale, frameLabel, movesBetween } from "./replay.js";

const piece = (id: string, owner: "A" | "B", x: number, y: number) => ({ id, kind: "scout", owner, x, y });
const frame = (...pieces: ReturnType<typeof piece>[]): AdminFrame => ({ pieces, visible: { A: [], B: [] } });

const match: AdminMatchDetail = {
  id: "m",
  playerA: { id: "a", handle: "anne" },
  playerB: { id: "b", handle: "bruno" },
  rulesetVersion: "v",
  scenario: "s",
  startedAt: 0,
  finishedAt: 1,
  outcome: { kind: "victory", winner: "A", reason: "resignation" },
  actions: 2,
  log: [
    { seq: 0, player: "A", action: { kind: "move", pieceId: "a1", to: { x: 2, y: 1 } } },
    { seq: 1, player: "B", action: { kind: "resign" } },
  ],
  frames: [
    frame(piece("a1", "A", 1, 1), piece("b1", "B", 4, 4)),
    frame(piece("a1", "A", 2, 1), piece("b1", "B", 4, 4)),
    frame(piece("a1", "A", 2, 1), piece("b1", "B", 4, 4)),
  ],
  replayError: null,
};

describe("rejeu : lecture des images", () => {
  it("retrouve la pièce déplacée entre deux images, et seulement elle", () => {
    expect(movesBetween(match.frames[0] as AdminFrame, match.frames[1] as AdminFrame)).toEqual([
      { pieceId: "a1", owner: "A", from: { x: 1, y: 1 }, to: { x: 2, y: 1 } },
    ]);
    expect(movesBetween(match.frames[1] as AdminFrame, match.frames[2] as AdminFrame)).toEqual([]);
  });

  it("écrit un coup comme l'historique de la maquette, et l'abandon en toutes lettres", () => {
    expect(describeEntry(match, 0)).toBe("1,1 → 2,1");
    expect(describeEntry(match, 1)).toBe("abandon");
  });

  it("annonce chaque image avec son camp et son joueur", () => {
    expect(frameLabel(match, 0)).toBe("position de départ");
    expect(frameLabel(match, 1)).toBe("coup 1 / 2 — A · anne — 1,1 → 2,1");
    expect(frameLabel(match, 2)).toBe("coup 2 / 2 — B · bruno — abandon");
  });

  it("borne la navigation aux images existantes", () => {
    expect(clampFrame(-1, 3)).toBe(0);
    expect(clampFrame(9, 3)).toBe(2);
    expect(clampFrame(0, 0)).toBe(0);
  });
});

describe("rejeu : cadrage", () => {
  const board = Board.fromAscii(["0000", "0020", "0000"]);
  const base = { tileWidth: METRICS.tileWidth, tileHeight: METRICS.tileHeight, heightUnit: METRICS.heightUnit, pivot: { x: 1.5, y: 1 } };

  it("fait tenir le plateau, centré, dans le cadre à chaque quart de tour", () => {
    const [width, height] = [600, 400];
    const scale = fitScale(board, base, width, height, 20);
    for (let quarter = 0; quarter < 4; quarter += 1) {
      const proj = { ...base, scale, rotation: quarter * QUARTER_TURN };
      const offset = centerOffset(board, proj);
      for (const tile of board.allTiles()) {
        for (const level of [0, tile.height]) {
          for (const corner of tileQuad(tile.coord, level, proj)) {
            expect(Math.abs(corner.x + offset.x)).toBeLessThanOrEqual(width / 2);
            expect(Math.abs(corner.y + offset.y)).toBeLessThanOrEqual(height / 2);
          }
        }
      }
    }
  });

  it("grandit avec le cadre", () => {
    expect(fitScale(board, base, 1200, 800, 20)).toBeGreaterThan(fitScale(board, base, 600, 400, 20));
  });
});
