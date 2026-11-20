import { describe, expect, it } from "vitest";
import type { Action } from "./actions.js";
import { Board } from "./board.js";
import { type MatchMemory, advanceMemory, replayMemory, startMemory, viewFor } from "./fog.js";
import { STRICT_CHESS_RULES } from "./pieces/index.js";
import type { Result } from "./result.js";
import { type GameState, createGame } from "./state.js";
import { chessRuleset, definePiece, placePiece } from "./testing.js";

const ruleset = chessRuleset([
  definePiece("scout", { steps: 1, adjacency: "orthogonal", vision: 3 }),
  // Ne voit que sa propre case : une pièce qu'on peut perdre sans rien voir venir.
  definePiece("sentry", { steps: 1, adjacency: "orthogonal", vision: 0 }),
  definePiece("commander", { steps: 1, adjacency: "orthogonal", vision: 1, isCommander: true }),
]);

function unwrap<T>(result: Result<T, unknown>): T {
  if (!result.ok) throw new Error(`coup refusé : ${JSON.stringify(result.error)}`);
  return result.value;
}

function play(memory: MatchMemory, ...actions: Action[]): MatchMemory {
  return actions.reduce((current, action) => unwrap(advanceMemory(current, action)), memory);
}

const move = (pieceId: string, x: number, y: number): Action => ({
  kind: "move",
  pieceId,
  to: { x, y },
});

/**
 * Un plateau de 12 × 3 : A à gauche, B à droite, trop loin pour se voir. Le scout de B
 * en (8,1) est à un pas de la portée de vue du scout de A en (4,1).
 */
function farApart(): GameState {
  return createGame(Board.flat(12, 3), ruleset, [
    placePiece("a-cmd", "commander", "A", 0, 0),
    placePiece("a-scout", "scout", "A", 4, 1),
    placePiece("b-cmd", "commander", "B", 11, 2),
    placePiece("b-scout", "scout", "B", 8, 1),
  ]);
}

describe("journal d'un joueur", () => {
  it("décrit ses propres coups en entier", () => {
    const memory = play(startMemory(farApart()), move("a-scout", 4, 2));
    expect(memory.knowledge.A.journal).toEqual([
      {
        turn: 1,
        player: "A",
        kind: "scout",
        from: { x: 4, y: 1 },
        to: { x: 4, y: 2 },
        captured: undefined,
      },
    ]);
  });

  it("ne dit rien d'un coup adverse joué hors de vue", () => {
    const memory = play(startMemory(farApart()), move("a-cmd", 0, 1), move("b-cmd", 11, 1));
    expect(memory.knowledge.A.journal[1]).toEqual({
      turn: 2,
      player: "B",
      kind: undefined,
      from: undefined,
      to: undefined,
      captured: undefined,
    });
  });

  it("donne l'arrivée et le type d'une pièce adverse qui entre dans la vue", () => {
    const memory = play(startMemory(farApart()), move("a-cmd", 0, 1), move("b-scout", 7, 1));
    expect(memory.knowledge.A.journal[1]).toMatchObject({
      player: "B",
      kind: "scout",
      from: undefined,
      to: { x: 7, y: 1 },
    });
  });

  it("donne le départ d'une pièce adverse qui sort de la vue", () => {
    const memory = play(
      startMemory(farApart()),
      move("a-cmd", 0, 1),
      move("b-scout", 7, 1),
      move("a-cmd", 0, 0),
      move("b-scout", 8, 1),
    );
    expect(memory.knowledge.A.journal[3]).toMatchObject({
      kind: "scout",
      from: { x: 7, y: 1 },
      to: undefined,
    });
  });

  it("connaît toujours la case et le type d'une pièce perdue, même hors de vue", () => {
    // La sentinelle de A ne voit que sa case, et son commandant est loin : le scout de B
    // arrive de (2,0) sans que A l'ait jamais vu.
    const state = createGame(Board.flat(8, 1), ruleset, [
      placePiece("a-cmd", "commander", "A", 7, 0),
      placePiece("a-bait", "sentry", "A", 1, 0),
      placePiece("b-cmd", "commander", "B", 4, 0),
      placePiece("b-scout", "scout", "B", 2, 0),
    ]);
    const memory = play(startMemory(state), move("a-cmd", 6, 0));
    const lost = play(memory, move("b-scout", 1, 0));
    expect(lost.knowledge.A.journal.at(-1)).toEqual({
      turn: 2,
      player: "B",
      kind: undefined,
      from: undefined,
      to: { x: 1, y: 0 },
      captured: "sentry",
    });
  });

  it("n'inscrit pas l'abandon, que l'issue dit déjà", () => {
    const memory = play(startMemory(farApart()), { kind: "resign", player: "A" });
    expect(memory.knowledge.A.journal).toEqual([]);
    expect(memory.knowledge.B.journal).toEqual([]);
  });

  it("se reconstruit à l'identique en rejouant le log", () => {
    const log = [move("a-cmd", 0, 1), move("b-scout", 7, 1), move("a-scout", 5, 1)];
    const live = play(startMemory(farApart()), ...log);
    const replayed = unwrap(replayMemory(farApart(), log));
    expect(replayed.knowledge.A.journal).toEqual(live.knowledge.A.journal);
    expect(replayed.knowledge.B.journal).toEqual(live.knowledge.B.journal);
  });
});

describe("compositions dans la vue", () => {
  it("liste les deux camps, pièces prises comprises", () => {
    const state = createGame(Board.flat(4, 1), ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("a-scout", "scout", "A", 1, 0),
      placePiece("b-scout", "scout", "B", 2, 0),
      placePiece("b-cmd", "commander", "B", 3, 0),
    ]);
    const memory = play(startMemory(state), move("a-scout", 2, 0));
    const view = viewFor(memory.state, memory.knowledge.B);
    expect(view.rosters.own).toEqual([
      { kind: "commander", taken: false },
      { kind: "scout", taken: true },
    ]);
    expect(view.rosters.opponent).toEqual([
      { kind: "commander", taken: false },
      { kind: "scout", taken: false },
    ]);
  });

  it("ne porte que des types, jamais une position", () => {
    const view = viewFor(farApart(), startMemory(farApart()).knowledge.A);
    for (const entry of view.rosters.opponent) {
      expect(Object.keys(entry).sort()).toEqual(["kind", "taken"]);
    }
  });
});

describe("compteur sans prise dans la vue", () => {
  it("donne le compte courant et le seuil du ruleset", () => {
    const memory = play(startMemory(farApart()), move("a-cmd", 0, 1), move("b-cmd", 11, 1));
    const view = viewFor(memory.state, memory.knowledge.A);
    expect(view.sinceCapture).toBe(2);
    expect(view.noCaptureLimit).toBe(STRICT_CHESS_RULES.draws?.withoutCapture);
  });
});
