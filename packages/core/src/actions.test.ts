import { describe, expect, it } from "vitest";
import {
  ACTIONS_WITHOUT_CAPTURE_LIMIT,
  type Action,
  applyAction,
  isCommanderThreatened,
  legalActions,
  replay,
  validateAction,
} from "./actions.js";
import { Board } from "./board.js";
import type { Result } from "./result.js";
import { type GameState, createGame, pieceAt, positionKey } from "./state.js";
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

describe("legalActions", () => {
  it("ne propose que les pièces du joueur au trait", () => {
    const actions = legalActions(duel());
    const moved = new Set(actions.map((a) => (a.kind === "move" ? a.pieceId : "")));
    expect(moved).toEqual(new Set(["a-scout", "a-cmd"]));
  });

  it("ne propose pas de passer son tour", () => {
    const state = duel();
    const scout = state.pieces.get("a-scout")!;
    const passing = legalActions(state).filter(
      (a) => a.kind === "move" && a.pieceId === "a-scout" && a.to.x === scout.coord.x && a.to.y === scout.coord.y,
    );
    expect(passing).toEqual([]);
  });

  it("est vide une fois la partie terminée", () => {
    const finished = unwrap(applyAction(duel(), { kind: "resign" }));
    expect(legalActions(finished)).toEqual([]);
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

  it("refuse une action qui ne fait rien", () => {
    const result = validateAction(duel(), { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 } });
    expect(result).toEqual({ ok: false, error: { code: "must-do-something" } });
  });
});

describe("applyAction — capture de mêlée", () => {
  const contact = () =>
    createGame(Board.flat(6, 3), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 2),
      placePiece("b-scout", "scout", "B", 2, 0),
      placePiece("b-cmd", "commander", "B", 5, 2),
    ]);

  it("capture en se déplaçant au contact, dans la même action", () => {
    const after = unwrap(
      applyAction(contact(), { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 }, capture: "b-scout" }),
    );
    expect(after.pieces.has("b-scout")).toBe(false);
    expect(after.pieces.get("a-scout")?.coord).toEqual({ x: 1, y: 0 });
    expect(after.turn).toBe(1);
  });

  it("laisse frapper un adjacent sans bouger", () => {
    const adjacent = createGame(Board.flat(6, 3), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 2),
      placePiece("b-scout", "scout", "B", 1, 0),
      placePiece("b-cmd", "commander", "B", 5, 2),
    ]);
    const after = unwrap(
      applyAction(adjacent, { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 }, capture: "b-scout" }),
    );
    expect(after.pieces.has("b-scout")).toBe(false);
    expect(after.pieces.get("a-scout")?.coord).toEqual({ x: 0, y: 0 });
  });

  it("refuse une cible hors de portée de mêlée", () => {
    const result = applyAction(contact(), {
      kind: "move",
      pieceId: "a-scout",
      to: { x: 0, y: 0 },
      capture: "b-scout",
    });
    expect(result).toEqual({ ok: false, error: { code: "target-out-of-melee", targetId: "b-scout" } });
  });

  it("refuse de capturer une pièce alliée", () => {
    const friendly = createGame(Board.flat(6, 3), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 1, 0),
      placePiece("b-cmd", "commander", "B", 5, 2),
    ]);
    const result = applyAction(friendly, {
      kind: "move",
      pieceId: "a-scout",
      to: { x: 0, y: 0 },
      capture: "a-cmd",
    });
    expect(result).toEqual({ ok: false, error: { code: "target-is-friendly", targetId: "a-cmd" } });
  });

  it("applique l'asymétrie de hauteur : on frappe vers le bas, pas deux niveaux vers le haut", () => {
    // Le scout de A est au sol, celui de B perché deux niveaux plus haut. Les deux
    // pièces maîtresses sont tenues à l'écart pour que seule la hauteur décide.
    const board = Board.fromAscii(["0300", "0000"]);
    const cliff = createGame(board, ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 1),
      placePiece("b-scout", "scout", "B", 1, 0),
      placePiece("b-cmd", "commander", "B", 3, 1),
    ]);
    const upward: Action = { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 }, capture: "b-scout" };
    expect(validateAction(cliff, upward)).toEqual({
      ok: false,
      error: { code: "target-out-of-melee", targetId: "b-scout" },
    });

    const bTurn = { ...cliff, activePlayer: "B" as const };
    const downward: Action = { kind: "move", pieceId: "b-scout", to: { x: 1, y: 0 }, capture: "a-scout" };
    expect(validateAction(bTurn, downward).ok).toBe(true);
  });
});

describe("fin de partie", () => {
  it("déclare la victoire quand la pièce maîtresse est capturée", () => {
    const state = createGame(Board.flat(4, 1), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 3, 0),
      placePiece("b-cmd", "commander", "B", 1, 0),
    ]);
    const after = unwrap(
      applyAction(state, { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 }, capture: "b-cmd" }),
    );
    expect(after.outcome).toEqual({ kind: "victory", winner: "A", reason: "commander-captured" });
  });

  it("donne la victoire à l'adversaire en cas d'abandon", () => {
    const after = unwrap(applyAction(duel(), { kind: "resign" }));
    expect(after.outcome).toEqual({ kind: "victory", winner: "B", reason: "resignation" });
  });

  it("refuse toute action après la fin de partie", () => {
    const finished = unwrap(applyAction(duel(), { kind: "resign" }));
    expect(applyAction(finished, { kind: "resign" })).toEqual({ ok: false, error: { code: "game-over" } });
  });

  it("déclare le pat quand le joueur au trait n'a plus aucun coup", () => {
    // B n'a que sa pièce maîtresse, murée en (4,0) et hors de portée de A.
    const board = Board.fromAscii(["000~0"]);
    const state = createGame(board, ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("b-cmd", "commander", "B", 4, 0),
    ]);
    expect(legalActions(state).length).toBeGreaterThan(0);

    const after = unwrap(applyAction(state, { kind: "move", pieceId: "a-cmd", to: { x: 1, y: 0 } }));
    expect(after.activePlayer).toBe("B");
    expect(after.outcome).toEqual({ kind: "draw", reason: "stalemate" });
  });
});

describe("isCommanderThreatened", () => {
  it("détecte une menace sur la pièce maîtresse", () => {
    const state = createGame(Board.flat(5, 1), ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("b-scout", "scout", "B", 2, 0),
      placePiece("b-cmd", "commander", "B", 4, 0),
    ]);
    expect(isCommanderThreatened(state, "A")).toBe(true);
    expect(isCommanderThreatened(state, "B")).toBe(false);
  });

  it("ne voit pas de menace hors de portée", () => {
    const state = createGame(Board.flat(9, 1), ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("b-scout", "scout", "B", 8, 0),
      placePiece("b-cmd", "commander", "B", 6, 0),
    ]);
    expect(isCommanderThreatened(state, "A")).toBe(false);
  });
});

describe("pieceAt", () => {
  it("retrouve la pièce sur une case, ou rien", () => {
    const state = duel();
    expect(pieceAt(state, { x: 0, y: 0 })?.id).toBe("a-scout");
    expect(pieceAt(state, { x: 3, y: 1 })).toBeUndefined();
  });
});

describe("échec et mat", () => {
  /**
   * A n'a que sa pièce maîtresse en (0,0). Le scout de B en (0,1) la frappe depuis
   * une corniche de hauteur 2 : elle ne peut pas riposter vers le haut (section 5.3),
   * et sa seule case de fuite (1,0) est couverte depuis (1,1), elle aussi perchée.
   */
  function matingNet(): GameState {
    return createGame(Board.fromAscii(["0000", "2220", "0000"]), ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("b-striker", "scout", "B", 0, 1),
      placePiece("b-cover", "scout", "B", 2, 1),
      placePiece("b-cmd", "commander", "B", 3, 2),
    ]);
  }

  it("interdit un coup qui laisse sa propre pièce maîtresse en prise", () => {
    // Le scout de A cloue le sien : s'écarter en (1,1) ouvrirait à b-scout la route
    // de (1,0), d'où il frapperait la pièce maîtresse restée en (0,0).
    const pinned = createGame(Board.flat(5, 2), ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("a-scout", "scout", "A", 1, 0),
      placePiece("b-scout", "scout", "B", 2, 0),
      placePiece("b-cmd", "commander", "B", 4, 1),
    ]);

    const sidestep: Action = { kind: "move", pieceId: "a-scout", to: { x: 1, y: 1 } };
    expect(validateAction(pinned, sidestep)).toEqual({
      ok: false,
      error: { code: "leaves-commander-exposed" },
    });
    expect(legalActions(pinned)).not.toContainEqual(sidestep);

    // Prendre le cloueur reste licite : la menace disparaît avec lui.
    const capture: Action = { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 }, capture: "b-scout" };
    expect(validateAction(pinned, capture).ok).toBe(true);
  });

  it("laisse l'abandon possible même sans aucun coup jouable", () => {
    const mated = { ...matingNet(), activePlayer: "A" as const };
    expect(isCommanderThreatened(mated, "A")).toBe(true);
    expect(legalActions(mated)).toEqual([]);
    expect(validateAction(mated, { kind: "resign" }).ok).toBe(true);
  });

  it("déclare le mat quand la pièce maîtresse est menacée et sans parade", () => {
    const before = { ...matingNet(), activePlayer: "B" as const };
    const pieces = new Map(before.pieces);
    pieces.set("b-cover", { ...pieces.get("b-cover")!, coord: { x: 2, y: 1 } });

    const after = unwrap(applyAction(before, { kind: "move", pieceId: "b-cover", to: { x: 1, y: 1 } }));
    expect(after.activePlayer).toBe("A");
    expect(after.outcome).toEqual({ kind: "victory", winner: "B", reason: "checkmate" });
  });

  it("distingue le pat du mat : sans menace, aucune parade vaut nulle", () => {
    const board = Board.fromAscii(["000~0"]);
    const state = createGame(board, ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("b-cmd", "commander", "B", 4, 0),
    ]);
    const after = unwrap(applyAction(state, { kind: "move", pieceId: "a-cmd", to: { x: 1, y: 0 } }));
    expect(isCommanderThreatened(after, "B")).toBe(false);
    expect(after.outcome).toEqual({ kind: "draw", reason: "stalemate" });
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

describe("nulles anti-blocage", () => {
  /** Deux éclaireurs qui font l'aller-retour sur une bande, loin des maîtresses. */
  function shuffling(): GameState {
    return createGame(Board.flat(12, 2), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 1),
      placePiece("b-scout", "scout", "B", 11, 0),
      placePiece("b-cmd", "commander", "B", 11, 1),
    ]);
  }

  const shuffle: readonly Action[] = [
    { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } },
    { kind: "move", pieceId: "b-scout", to: { x: 10, y: 0 } },
    { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 } },
    { kind: "move", pieceId: "b-scout", to: { x: 11, y: 0 } },
  ];

  function repeat(times: number): GameState {
    let state = shuffling();
    for (let round = 0; round < times; round++) {
      for (const action of shuffle) state = unwrap(applyAction(state, action));
    }
    return state;
  }

  it("compte la position de départ comme une occurrence", () => {
    // Sans elle, y revenir deux fois n'en ferait que deux et la troisième
    // répétition n'arriverait jamais au bon coup.
    const start = shuffling();
    expect(start.draw.seen.get(positionKey(start))).toBe(1);
  });

  it("ne déclare rien après une seule boucle", () => {
    expect(repeat(1).outcome).toBeNull();
  });

  it("déclare la nulle à la troisième occurrence de la même position", () => {
    const after = repeat(2);
    expect(after.outcome).toEqual({ kind: "draw", reason: "repetition" });
  });

  it("remet le compteur de captures à zéro quand une pièce tombe", () => {
    const state = createGame(Board.flat(12, 2), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 1),
      placePiece("b-scout", "scout", "B", 5, 0),
      placePiece("b-cmd", "commander", "B", 11, 1),
    ]);

    const approach = [
      { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } },
      { kind: "move", pieceId: "b-scout", to: { x: 3, y: 0 } },
    ] as const;
    const walked = approach.reduce<GameState>(
      (current, action) => unwrap(applyAction(current, action)),
      state,
    );
    expect(walked.draw.sinceCapture).toBe(2);

    const captured = unwrap(
      applyAction(walked, {
        kind: "move",
        pieceId: "a-scout",
        to: { x: 2, y: 0 },
        capture: "b-scout",
      }),
    );
    expect(captured.draw.sinceCapture).toBe(0);
  });

  it("déclare la nulle après trop d'actions sans capture", () => {
    // Une carte assez large pour éviter la triple répétition : c'est bien le
    // compteur de captures qu'on éprouve, pas la règle de répétition.
    let state = createGame(Board.flat(40, 2), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 1),
      placePiece("b-scout", "scout", "B", 39, 0),
      placePiece("b-cmd", "commander", "B", 39, 1),
    ]);

    for (let step = 0; step < ACTIONS_WITHOUT_CAPTURE_LIMIT; step++) {
      const player = state.activePlayer;
      const forward = legalActions(state).find(
        (action) => action.kind === "move" && action.capture === undefined,
      );
      expect(forward).toBeDefined();
      state = unwrap(applyAction(state, forward as Action));
      if (state.outcome !== null) break;
      expect(player).toBeDefined();
    }

    expect(state.draw.sinceCapture).toBeGreaterThanOrEqual(1);
    expect(state.outcome).toEqual({ kind: "draw", reason: "no-capture" });
  });
});
