import { describe, expect, it } from "vitest";
import type { MeMatchDebrief } from "@occulis/protocol";
import { messagesFor } from "@occulis/i18n";
import { debriefReason, debriefStats, eloBefore, formatDuration } from "./model.js";

/** Une partie de trois coups : A déplace deux fois la même pièce, B une, puis A abandonne. */
function debrief(): MeMatchDebrief {
  const frame = (a: string[], b: string[]) => ({ pieces: [], traps: [], visible: { A: a, B: b } });
  return {
    seat: "A",
    startedAt: 1_000,
    finishedAt: 1_000 + 754_000,
    log: [
      { seq: 0, player: "A", action: { kind: "move", pieceId: "a1", to: { x: 1, y: 0 } } },
      { seq: 1, player: "B", action: { kind: "move", pieceId: "b1", to: { x: 5, y: 5 } } },
      { seq: 2, player: "A", action: { kind: "move", pieceId: "a1", to: { x: 2, y: 0 } } },
      { seq: 3, player: "A", action: { kind: "resign" } },
    ],
    frames: [
      frame(["0,0", "1,0"], ["5,5"]),
      frame(["1,0", "2,0"], ["5,5", "5,4"]),
      frame(["2,0", "3,0"], ["5,4"]),
    ],
  } as unknown as MeMatchDebrief;
}

describe("debriefStats", () => {
  it("compte les coups, les pièces et les cases vues de chaque camp", () => {
    expect(debriefStats(debrief())).toEqual({
      self: { moves: 2, pieces: 1, seen: 4 },
      opponent: { moves: 1, pieces: 1, seen: 2 },
      durationMs: 754_000,
      endedOn: 4,
    });
  });

  it("prend le point de vue du camp tenu", () => {
    const stats = debriefStats({ ...debrief(), seat: "B" });
    expect(stats.self.moves).toBe(1);
    expect(stats.opponent.moves).toBe(2);
  });

  it("n'invente pas de durée à une partie sans fin", () => {
    expect(debriefStats({ ...debrief(), finishedAt: null }).durationMs).toBeNull();
  });
});

describe("eloBefore", () => {
  it("retire la variation de la partie, et rien pour une partie non classée", () => {
    expect(eloBefore(1216, 16)).toBe(1200);
    expect(eloBefore(1184, -16)).toBe(1200);
    expect(eloBefore(1200, null)).toBe(1200);
  });
});

describe("formatDuration", () => {
  it("écrit minutes et secondes, et les heures au-delà", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(754_000)).toBe("12:34");
    expect(formatDuration(3_723_000)).toBe("1:02:03");
    expect(formatDuration(-5)).toBe("0:00");
  });
});

describe("debriefReason", () => {
  const m = messagesFor("fr").game.debrief;

  it("dit comment la partie s'est close, du point de vue du joueur", () => {
    const resigned = { kind: "victory", winner: "A", reason: "resignation" } as const;
    const mated = { kind: "victory", winner: "A", reason: "checkmate" } as const;
    expect(debriefReason(m, resigned, true, 12)).toBe(m.resignation.won(12));
    expect(debriefReason(m, mated, true, 12)).toBe(m.checkmate.won(12));
    expect(debriefReason(m, mated, false, 12)).toBe(m.checkmate.lost(12));
  });

  it("nomme la règle qui a rendu la partie nulle", () => {
    expect(debriefReason(m, { kind: "draw", reason: "stalemate" }, false, 40)).toBe(
      m.draws.stalemate(40),
    );
    expect(debriefReason(m, { kind: "draw", reason: "no-capture" }, false, 60)).toBe(
      m.draws["no-capture"](60),
    );
  });

  it("tient une partie close sans issue inscrite pour un abandon", () => {
    expect(debriefReason(m, null, false, 3)).toBe(m.resignation.lost(3));
  });
});
