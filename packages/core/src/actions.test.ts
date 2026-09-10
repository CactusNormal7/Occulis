import { describe, expect, it } from "vitest";
import { type Action, applyAction, legalActions, replay, validateAction } from "./actions.js";
import { Board } from "./board.js";
import type { Result } from "./result.js";
import { type GameState, createGame, pieceAt } from "./state.js";
import { definePiece, placePiece, testRuleset } from "./testing.js";

const ruleset = testRuleset(
  definePiece("scout", { steps: 2, adjacency: "orthogonal" }),
  definePiece("commander", { steps: 1, adjacency: "orthogonal", isCommander: true }),
);

function unwrap<T>(result: Result<T, unknown>): T {
  if (!result.ok) throw new Error(`action refusée: ${JSON.stringify(result.error)}`);
  return result.value;
}

/** Duel minimal : un scout de chaque camp, plus les deux pièces maîtresses. */
function duel(board = Board.flat(6, 3)): GameState {
  return createGame(board, ruleset, [
    placePiece("a-scout", "scout", "A", 0, 0),
    placePiece("a-cmd", "commander", "A", 0, 2),
    placePiece("b-scout", "scout", "B", 5, 0),
    placePiece("b-cmd", "commander", "B", 5, 2),
  ]);
}

/** Les destinations proposées à une pièce, sous forme de clés `x,y`. */
function destinationsOf(state: GameState, pieceId: string): Set<string> {
  return new Set(
    legalActions(state)
      .filter((action) => action.kind === "move" && action.pieceId === pieceId)
      .map((action) => (action.kind === "move" ? `${action.to.x},${action.to.y}` : "")),
  );
}

describe("legalActions", () => {
  it("ne propose que les pièces du joueur au trait", () => {
    const actions = legalActions(duel());
    const moved = new Set(actions.map((a) => (a.kind === "move" ? a.pieceId : "")));
    expect(moved).toEqual(new Set(["a-scout", "a-cmd"]));
  });

  it("ne propose pas de passer son tour", () => {
    expect(destinationsOf(duel(), "a-scout").has("0,0")).toBe(false);
  });

  it("est vide une fois la partie terminée", () => {
    const finished = unwrap(applyAction(duel(), { kind: "resign" }));
    expect(legalActions(finished)).toEqual([]);
  });
});

describe("les pièces se barrent la route", () => {
  /** Un scout de A en (0,0), l'obstacle en (1,0) sur une bande de 6 × 3. */
  function withBlocker(owner: "A" | "B"): GameState {
    return createGame(Board.flat(6, 3), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 2),
      placePiece("blocker", owner === "A" ? "commander" : "scout", owner, 1, 0),
      placePiece("b-cmd", "commander", "B", 5, 2),
    ]);
  }

  it("interdit d'aller sur la case d'une pièce adverse", () => {
    expect(destinationsOf(withBlocker("B"), "a-scout").has("1,0")).toBe(false);
  });

  it("interdit d'aller sur la case d'une pièce alliée", () => {
    expect(destinationsOf(withBlocker("A"), "a-scout").has("1,0")).toBe(false);
  });

  it("interdit de traverser une pièce pour aller au-delà", () => {
    // Le scout marche de 2 pas en orthogonal : (2,0) ne s'atteint qu'en passant
    // par (1,0), tenue par l'adversaire. Le contournement demanderait 3 pas.
    const destinations = destinationsOf(withBlocker("B"), "a-scout");
    expect(destinations.has("2,0")).toBe(false);
    expect(destinations.has("1,1")).toBe(true);
  });

  it("libère la case que la pièce quitte", () => {
    // a-scout part de (0,0) : a-cmd en (0,1) doit pouvoir y venir, alors même que
    // l'occupation calculée pour le tour entier la donne prise.
    const state = createGame(Board.flat(6, 3), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 1),
      placePiece("b-cmd", "commander", "B", 5, 2),
    ]);
    expect(destinationsOf(state, "a-cmd").has("0,0")).toBe(false);
    const after = unwrap(applyAction(state, { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } }));
    const bTurn = { ...after, activePlayer: "A" as const };
    expect(destinationsOf(bTurn, "a-cmd").has("0,0")).toBe(true);
  });
});

describe("applyAction — déplacement", () => {
  it("déplace la pièce et rend la main à l'adversaire", () => {
    const before = duel();
    const after = unwrap(applyAction(before, { kind: "move", pieceId: "a-scout", to: { x: 2, y: 0 } }));

    expect(after.pieces.get("a-scout")?.coord).toEqual({ x: 2, y: 0 });
    expect(after.activePlayer).toBe("B");
    expect(after.turn).toBe(1);
    // L'état d'origine n'est jamais muté.
    expect(before.pieces.get("a-scout")?.coord).toEqual({ x: 0, y: 0 });
    expect(before.activePlayer).toBe("A");
  });

  it("refuse une destination hors de portée", () => {
    const result = applyAction(duel(), { kind: "move", pieceId: "a-scout", to: { x: 4, y: 0 } });
    expect(result).toEqual({ ok: false, error: { code: "unreachable", to: { x: 4, y: 0 } } });
  });

  it("refuse de jouer la pièce de l'adversaire", () => {
    const result = applyAction(duel(), { kind: "move", pieceId: "b-scout", to: { x: 4, y: 0 } });
    expect(result).toEqual({ ok: false, error: { code: "not-your-piece", pieceId: "b-scout" } });
  });

  it("refuse une pièce inconnue", () => {
    const result = applyAction(duel(), { kind: "move", pieceId: "fantome", to: { x: 1, y: 0 } });
    expect(result).toEqual({ ok: false, error: { code: "unknown-piece", pieceId: "fantome" } });
  });

  it("refuse de rester sur place", () => {
    const result = validateAction(duel(), { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 } });
    expect(result).toEqual({ ok: false, error: { code: "unreachable", to: { x: 0, y: 0 } } });
  });
});

describe("fin de partie", () => {
  it("donne la victoire à l'adversaire en cas d'abandon", () => {
    const after = unwrap(applyAction(duel(), { kind: "resign" }));
    expect(after.outcome).toEqual({ kind: "victory", winner: "B", reason: "resignation" });
  });

  it("refuse toute action après la fin de partie", () => {
    const finished = unwrap(applyAction(duel(), { kind: "resign" }));
    expect(applyAction(finished, { kind: "resign" })).toEqual({ ok: false, error: { code: "game-over" } });
  });

  it("ne termine rien tout seul : ni mat, ni pat, ni nulle", () => {
    // B n'a que sa pièce maîtresse, murée en (4,0). Sous l'ancienne règle c'était un
    // pat ; il ne lui reste désormais que l'abandon (docs/design.md 7.1, suspendue).
    const state = createGame(Board.fromAscii(["000~0"]), ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("b-cmd", "commander", "B", 4, 0),
    ]);
    const after = unwrap(applyAction(state, { kind: "move", pieceId: "a-cmd", to: { x: 1, y: 0 } }));

    expect(after.activePlayer).toBe("B");
    expect(after.outcome).toBeNull();
    expect(legalActions(after)).toEqual([]);
    expect(validateAction(after, { kind: "resign" }).ok).toBe(true);
  });

  it("laisse jouer un coup qui expose sa propre pièce maîtresse", () => {
    // Position autrefois « clouée » : s'écarter ouvrait la route de la maîtresse et
    // le coup était refusé. Sans règle d'échec, il est simplement légal.
    const exposed = createGame(Board.flat(5, 2), ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("a-scout", "scout", "A", 1, 0),
      placePiece("b-scout", "scout", "B", 2, 0),
      placePiece("b-cmd", "commander", "B", 4, 1),
    ]);
    const sidestep: Action = { kind: "move", pieceId: "a-scout", to: { x: 1, y: 1 } };

    expect(validateAction(exposed, sidestep).ok).toBe(true);
    expect(legalActions(exposed)).toContainEqual(sidestep);
  });
});

describe("pieceAt", () => {
  it("retrouve la pièce sur une case, ou rien", () => {
    const state = duel();
    expect(pieceAt(state, { x: 0, y: 0 })?.id).toBe("a-scout");
    expect(pieceAt(state, { x: 3, y: 1 })).toBeUndefined();
  });
});

describe("historique et rejeu", () => {
  it("consigne chaque coup joué avec son auteur", () => {
    const first: Action = { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } };
    const after = unwrap(applyAction(duel(), first));
    expect(after.history).toEqual([{ player: "A", action: first }]);
  });

  it("rejoue un log et retrouve exactement la même position", () => {
    const start = duel();
    const log: Action[] = [
      { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } },
      { kind: "move", pieceId: "b-scout", to: { x: 4, y: 0 } },
      { kind: "move", pieceId: "a-scout", to: { x: 2, y: 0 } },
    ];
    const played = log.reduce((state, action) => unwrap(applyAction(state, action)), start);
    const rebuilt = unwrap(replay(start, log));

    expect(rebuilt.turn).toBe(played.turn);
    expect(rebuilt.activePlayer).toBe(played.activePlayer);
    expect([...rebuilt.pieces.values()]).toEqual([...played.pieces.values()]);
    expect(rebuilt.history).toEqual(played.history);
  });

  it("signale le coup fautif d'un log corrompu plutôt que de diverger en silence", () => {
    const start = duel();
    const log: Action[] = [
      { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } },
      { kind: "move", pieceId: "b-scout", to: { x: 0, y: 0 } },
    ];
    expect(replay(start, log)).toEqual({
      ok: false,
      error: { code: "unreachable", to: { x: 0, y: 0 }, seq: 1 },
    });
  });
});
