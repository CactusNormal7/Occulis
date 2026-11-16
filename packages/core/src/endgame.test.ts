import { describe, expect, it } from "vitest";
import { type Action, applyAction, legalActions, replay, validateAction } from "./actions.js";
import { Board } from "./board.js";
import { isKingThreatened } from "./endgame.js";
import { advanceMemory, startMemory, viewFor } from "./fog.js";
import type { Piece, PlayerId } from "./pieces/index.js";
import type { Result } from "./result.js";
import { type GameState, createGame } from "./state.js";
import { chessRuleset, definePiece, placePiece } from "./testing.js";

/**
 * La prise, l'échec, le mat, le pat et les nulles, sur des pièces définies pour le test :
 * le roster est provisoire et ne doit pas pouvoir casser une vérification de règle.
 *
 * Les pièces se déplacent par diffusion (`reachableTiles`), pas en ligne : une « tour »
 * contourne donc un obstacle si son budget de pas le permet. Les positions ci-dessous
 * sont comptées en pas.
 */
const TYPES = [
  definePiece("king", { steps: 1, adjacency: "octile", isCommander: true }),
  definePiece("guard", { steps: 1, adjacency: "octile" }),
  definePiece("rook", { steps: 3, adjacency: "orthogonal" }),
  definePiece("knight", { steps: 2, adjacency: "octile" }),
];
const ruleset = chessRuleset(TYPES);

function unwrap<T>(result: Result<T, unknown>): T {
  if (!result.ok) throw new Error(`action refusée: ${JSON.stringify(result.error)}`);
  return result.value;
}

function game(pieces: Piece[], first: PlayerId = "A", board = Board.flat(5, 5)): GameState {
  return createGame(board, ruleset, pieces, first);
}

function move(pieceId: string, x: number, y: number): Action {
  return { kind: "move", pieceId, to: { x, y } };
}

function play(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((current, action) => unwrap(applyAction(current, action)), state);
}

function destinationsOf(state: GameState, pieceId: string): Set<string> {
  return new Set(
    legalActions(state).flatMap((action) =>
      action.kind === "move" && action.pieceId === pieceId ? [`${action.to.x},${action.to.y}`] : [],
    ),
  );
}

const KINGS = [placePiece("a-king", "king", "A", 0, 4), placePiece("b-king", "king", "B", 4, 4)];

describe("prise à l'arrivée", () => {
  const start = (): GameState =>
    game([
      ...KINGS,
      placePiece("a-rook", "rook", "A", 0, 0),
      placePiece("a-guard", "guard", "A", 0, 1),
      placePiece("b-guard", "guard", "B", 2, 0),
    ]);

  it("propose la case d'une pièce adverse, jamais celle d'une alliée", () => {
    const destinations = destinationsOf(start(), "a-rook");
    expect(destinations.has("2,0")).toBe(true);
    expect(destinations.has("0,1")).toBe(false);
  });

  it("retire la pièce prise et consigne la prise", () => {
    const after = play(start(), move("a-rook", 2, 0));
    expect(after.pieces.has("b-guard")).toBe(false);
    expect(after.pieces.get("a-rook")?.coord).toEqual({ x: 2, y: 0 });
    expect(after.history.at(-1)?.captured?.id).toBe("b-guard");
    expect(after.draw.sinceCapture).toBe(0);
  });

  it("ne traverse pas la pièce qu'elle pourrait prendre", () => {
    const corridor = game(
      [placePiece("a-rook", "rook", "A", 0, 0), placePiece("b-guard", "guard", "B", 1, 0)],
      "A",
      Board.flat(4, 1),
    );
    expect(destinationsOf(corridor, "a-rook")).toEqual(new Set(["1,0"]));
  });
});

describe("échec — un coup ne laisse jamais son roi prenable", () => {
  /**
   * Le roi de A en (0,0), couvert par son garde en (1,0) ; la tour de B en (3,0), à
   * trois pas du roi par la rangée, à cinq par le détour.
   */
  const pinned = (): GameState =>
    game([
      placePiece("a-king", "king", "A", 0, 0),
      placePiece("a-guard", "guard", "A", 1, 0),
      placePiece("b-rook", "rook", "B", 3, 0),
      placePiece("b-king", "king", "B", 4, 4),
    ]);

  it("refuse le coup d'une pièce clouée", () => {
    expect(validateAction(pinned(), move("a-guard", 1, 1))).toEqual({
      ok: false,
      error: { code: "leaves-king-exposed" },
    });
  });

  it("ne garde dans les coups légaux que ceux qui tiennent le roi à l'abri", () => {
    // Le garde ne peut qu'avancer dans la rangée ; le roi ne peut pas aller en (1,1),
    // à trois pas de la tour.
    expect(destinationsOf(pinned(), "a-guard")).toEqual(new Set(["2,0"]));
    expect(destinationsOf(pinned(), "a-king")).toEqual(new Set(["0,1"]));
  });

  it("s'applique même quand la menace est hors de la ligne de vue", () => {
    const myopic = chessRuleset([
      definePiece("king", { steps: 1, isCommander: true, vision: 1 }),
      definePiece("guard", { steps: 1, vision: 1 }),
      definePiece("rook", { steps: 3, adjacency: "orthogonal", vision: 1 }),
    ]);
    const state = createGame(Board.flat(5, 5), myopic, [...pinned().pieces.values()]);
    const view = viewFor(state, startMemory(state).knowledge.A);

    expect(view.visibleEnemies).toEqual([]);
    expect(validateAction(state, move("a-guard", 1, 1)).ok).toBe(false);
    expect(view.legalActions).toContainEqual(move("a-guard", 2, 0));
    expect(view.legalActions).not.toContainEqual(move("a-guard", 1, 1));
  });

  it("oblige à parer : fuir, couvrir ou prendre l'attaquant", () => {
    const checked = game([
      placePiece("a-king", "king", "A", 0, 0),
      placePiece("a-rook", "rook", "A", 2, 2),
      placePiece("b-rook", "rook", "B", 2, 0),
      placePiece("b-king", "king", "B", 4, 4),
    ]);
    expect(isKingThreatened(checked, "A")).toBe(true);

    const replies = legalActions(checked);
    expect(replies).toContainEqual(move("a-rook", 2, 0));
    expect(replies).toContainEqual(move("a-rook", 1, 0));
    for (const reply of replies) {
      expect(isKingThreatened(play(checked, reply), "A")).toBe(false);
    }
  });

  it("signale l'échec à son roi, jamais à l'adversaire", () => {
    const checked = game([
      placePiece("a-king", "king", "A", 0, 0),
      placePiece("b-rook", "rook", "B", 2, 0),
      placePiece("b-king", "king", "B", 4, 4),
    ]);
    const memory = startMemory(checked);
    expect(viewFor(checked, memory.knowledge.A).check).toBe(true);
    expect(viewFor(checked, memory.knowledge.B).check).toBe(false);
  });
});

describe("mat et pat", () => {
  it("donne la victoire quand le roi menacé n'a plus aucune parade", () => {
    // Le cavalier (deux pas en octile) vient en (2,2) : il tient (0,0) et ses trois voisines.
    const state = game(
      [
        placePiece("a-king", "king", "A", 0, 0),
        placePiece("b-knight", "knight", "B", 4, 2),
        placePiece("b-king", "king", "B", 4, 4),
      ],
      "B",
    );
    const mated = play(state, move("b-knight", 2, 2));

    expect(mated.outcome).toEqual({ kind: "victory", winner: "B", reason: "checkmate" });
    expect(legalActions(mated)).toEqual([]);
    expect(applyAction(mated, move("a-king", 1, 0))).toEqual({
      ok: false,
      error: { code: "game-over" },
    });
  });

  it("ne déclare pas mat tant qu'une parade existe", () => {
    const state = game(
      [
        placePiece("a-king", "king", "A", 0, 0),
        placePiece("a-rook", "rook", "A", 0, 3),
        placePiece("b-knight", "knight", "B", 4, 2),
        placePiece("b-king", "king", "B", 4, 4),
      ],
      "B",
    );
    const checked = play(state, move("b-knight", 2, 2));

    // Deux parades : prendre le cavalier, ou lui barrer en (1,1) son seul chemin de deux pas.
    expect(checked.outcome).toBeNull();
    expect(destinationsOf(checked, "a-king")).toEqual(new Set());
    expect(destinationsOf(checked, "a-rook")).toEqual(new Set(["2,2", "1,1"]));
  });

  it("rend la partie nulle quand le camp au trait ne peut plus jouer sans être en échec", () => {
    // Les deux gardes tiennent (1,0), (0,1) et (1,1), pas (0,0).
    const state = game(
      [
        placePiece("a-king", "king", "A", 0, 0),
        placePiece("b-guard-1", "guard", "B", 2, 1),
        placePiece("b-guard-2", "guard", "B", 2, 2),
        placePiece("b-king", "king", "B", 4, 4),
      ],
      "B",
    );
    const stuck = play(state, move("b-guard-2", 1, 2));

    expect(isKingThreatened(stuck, "A")).toBe(false);
    expect(stuck.outcome).toEqual({ kind: "draw", reason: "stalemate" });
  });
});

describe("nulles anti-blocage", () => {
  const shuffle = [
    move("a-king", 0, 3),
    move("b-king", 4, 3),
    move("a-king", 0, 4),
    move("b-king", 4, 4),
  ];

  it("arrête la partie à la troisième occurrence d'une position", () => {
    const start = game(KINGS);
    const twice = play(start, ...shuffle);
    expect(twice.outcome).toBeNull();

    const almost = play(twice, ...shuffle.slice(0, 3));
    expect(almost.outcome).toBeNull();
    expect(play(almost, move("b-king", 4, 4)).outcome).toEqual({
      kind: "draw",
      reason: "repetition",
    });
  });

  it("compte les positions par camp et par type, pas par identifiant", () => {
    const twins = (first: string, second: string): GameState =>
      game([
        ...KINGS,
        placePiece(first, "guard", "A", 0, 0),
        placePiece(second, "guard", "A", 2, 0),
      ]);
    expect([...twins("g1", "g2").draw.seen.keys()]).toEqual([
      ...twins("g2", "g1").draw.seen.keys(),
    ]);
  });

  it("arrête la partie après trop d'actions sans prise, et repart de zéro à une prise", () => {
    const patient = chessRuleset(TYPES, {
      capture: true,
      check: true,
      draws: { repetition: 99, withoutCapture: 4 },
    });
    const start = createGame(Board.flat(5, 5), patient, [
      ...KINGS,
      placePiece("a-rook", "rook", "A", 0, 0),
      placePiece("b-guard", "guard", "B", 2, 0),
    ]);

    expect(play(start, ...shuffle).outcome).toEqual({ kind: "draw", reason: "no-capture" });

    const afterCapture = play(start, ...shuffle.slice(0, 2), move("a-rook", 2, 0));
    expect(afterCapture.draw.sinceCapture).toBe(0);
    expect(afterCapture.outcome).toBeNull();
  });
});

describe("la prise sous le fog et dans le rejeu", () => {
  it("efface le souvenir d'une pièce que l'on vient de prendre", () => {
    const start = game([
      ...KINGS,
      placePiece("a-rook", "rook", "A", 0, 0),
      placePiece("b-guard", "guard", "B", 2, 0),
    ]);
    const before = startMemory(start);
    expect(before.knowledge.A.remembered.has("b-guard")).toBe(true);

    const after = unwrap(advanceMemory(before, move("a-rook", 2, 0)));
    const viewA = viewFor(after.state, after.knowledge.A);
    expect(viewA.ghosts).toEqual([]);
    expect(viewA.visibleEnemies.map((piece) => piece.id)).toEqual(["b-king"]);
    expect(viewFor(after.state, after.knowledge.B).ownPieces.map((piece) => piece.id)).toEqual([
      "b-king",
    ]);
  });

  it("rejoue un log avec ses prises et retrouve la même position et la même issue", () => {
    const state = game(
      [
        placePiece("a-king", "king", "A", 0, 0),
        placePiece("a-guard", "guard", "A", 3, 3),
        placePiece("b-knight", "knight", "B", 4, 2),
        placePiece("b-king", "king", "B", 4, 4),
      ],
      "B",
    );
    const log = [move("b-knight", 3, 3), move("a-king", 1, 0), move("b-knight", 2, 2)];
    const played = play(state, ...log);
    const replayed = unwrap(replay(state, log));

    expect([...replayed.pieces.values()]).toEqual([...played.pieces.values()]);
    expect(replayed.outcome).toEqual(played.outcome);
    expect(replayed.draw).toEqual(played.draw);
  });
});
