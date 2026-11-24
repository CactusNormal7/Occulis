import { describe, expect, it } from "vitest";
import {
  Board,
  type JournalEntry,
  type PlayerView,
  createGame,
  provisionalRulesetV4,
  startMemory,
  viewFor,
} from "@occulis/core";
import { messagesFor } from "@occulis/i18n";
import type { PieceSheet } from "../game/inspection.js";
import { aimAbility, selectionFor } from "../game/selection.js";
import {
  DRAW_WARNING_MARGIN,
  type HudInput,
  describeEntry,
  hudModel,
  trapNotice,
} from "./model.js";

const m = messagesFor("fr");

const BOARD = Board.flat(7, 3);

function startingView(): PlayerView {
  const state = createGame(BOARD, provisionalRulesetV4(), [
    { id: "a-king", kind: "commander", owner: "A", coord: { x: 0, y: 0 } },
    { id: "a-scout", kind: "scout", owner: "A", coord: { x: 1, y: 2 } },
    { id: "b-scout", kind: "scout", owner: "B", coord: { x: 5, y: 2 } },
    { id: "b-king", kind: "commander", owner: "B", coord: { x: 6, y: 0 } },
  ]);
  return viewFor(state, startMemory(state).knowledge.A);
}

const card = (handle: string, elo: number) => ({ handle, elo, played: 0, won: 0, feats: [] });

function input(overrides: Partial<HudInput> = {}): HudInput {
  return {
    view: startingView(),
    board: BOARD,
    watching: undefined,
    players: { self: card("anne", 1284), opponent: card("nyx", 1311) },
    opponentAway: false,
    pending: false,
    selection: undefined,
    sheet: undefined,
    ...overrides,
  };
}

describe("hudModel : plaques", () => {
  it("nomme le joueur « Vous » et l'adversaire par son pseudo, Elo compris", () => {
    const model = hudModel(m, input());
    expect(model.self).toMatchObject({ camp: "A", name: "Vous", elo: "1284 Elo", toMove: true });
    expect(model.opponent).toMatchObject({ camp: "B", name: "nyx", elo: "1311 Elo" });
    expect(model.opponent.toMove).toBe(false);
  });

  it("donne à un spectateur le nom de l'ami qu'il regarde", () => {
    expect(hudModel(m, input({ watching: "mirelle" })).self.name).toBe("mirelle");
  });

  it("dit l'adversaire hors ligne pendant son absence", () => {
    expect(hudModel(m, input({ opponentAway: true })).opponent.offline).toBe(true);
  });

  it("nomme chaque pièce de la composition, et dit celles qui sont prises", () => {
    const view = startingView();
    const taken: PlayerView = {
      ...view,
      rosters: { ...view.rosters, opponent: [{ kind: "scout", taken: true }] },
    };
    expect(hudModel(m, input({ view: taken })).opponent.roster).toEqual([
      { kind: "scout", label: "Éclaireur, prise", taken: true },
    ]);
  });
});

describe("hudModel : tour", () => {
  it("annonce le coup à jouer, et le trait au joueur", () => {
    expect(hudModel(m, input()).turn).toEqual({
      number: 1,
      line: "À vous de jouer",
      tone: "yours",
    });
  });

  it("dit le coup envoyé tant que le serveur n'a pas répondu", () => {
    expect(hudModel(m, input({ pending: true })).turn.line).toBe("Coup envoyé…");
  });

  it("dit l'échec au joueur au trait, et allume l'alerte", () => {
    const model = hudModel(m, input({ view: { ...startingView(), check: true } }));
    expect(model.turn).toMatchObject({ line: "Échec — à vous", tone: "check" });
    expect(model.check).toBe(true);
  });

  it("nomme le camp au trait quand ce n'est pas le joueur", () => {
    const view = { ...startingView(), activePlayer: "B" as const };
    expect(hudModel(m, input({ view })).turn).toMatchObject({
      line: "Au trait : nyx",
      tone: "waiting",
    });
  });

  it("garde le numéro du dernier coup une fois la partie finie", () => {
    const view: PlayerView = {
      ...startingView(),
      turn: 12,
      outcome: { kind: "draw", reason: "stalemate" },
    };
    expect(hudModel(m, input({ view })).turn).toEqual({
      number: 12,
      line: "Partie terminée",
      tone: "waiting",
    });
  });
});

describe("hudModel : fiche", () => {
  const scoutSheet: PieceSheet = {
    piece: { id: "a-scout", kind: "scout", owner: "A", coord: { x: 1, y: 2 } },
    relation: "own",
    role: "special",
    ability: null,
    steps: 3,
    adjacency: "octile",
    canClimb: true,
    lines: null,
    visionRange: 20,
    inCheck: false,
  };

  it("dit à qui est la pièce, où, et à quelle hauteur", () => {
    const sheet = hudModel(m, input({ sheet: scoutSheet })).sheet;
    expect(sheet).toMatchObject({ title: "Éclaireur", place: "À vous · 1,2 · hauteur 0" });
    expect(sheet?.reach).toBeUndefined();
  });

  it("compte les coups de la pièce sélectionnée, prises à part", () => {
    const view = startingView();
    const scout = view.ownPieces.find((piece) => piece.id === "a-scout");
    if (scout === undefined) throw new Error("éclaireur absent");
    const selection = selectionFor(view.legalActions, scout, view.visibleEnemies);
    const reach = hudModel(m, input({ view, selection, sheet: scoutSheet })).sheet?.reach;
    expect(reach?.moves).toBe(m.game.hud.moves(selection.moves.size - selection.captures.size));
  });

  it("ne montre la légende des lueurs qu'avec une pièce sélectionnée", () => {
    const view = startingView();
    const scout = view.ownPieces[0];
    if (scout === undefined) throw new Error("pièce absente");
    const selection = selectionFor(view.legalActions, scout);
    expect(hudModel(m, input()).showLegend).toBe(false);
    expect(hudModel(m, input({ selection })).showLegend).toBe(true);
    expect(hudModel(m, input({ selection, watching: "mirelle" })).showLegend).toBe(false);
  });
});

describe("hudModel : journal", () => {
  it("termine par le coup à venir, et marque le dernier coup joué", () => {
    const entry: JournalEntry = {
      turn: 1,
      player: "A",
      kind: "scout",
      from: { x: 1, y: 2 },
      to: { x: 2, y: 2 },
    };
    const view: PlayerView = { ...startingView(), turn: 1, activePlayer: "B", journal: [entry] };
    const journal = hudModel(m, input({ view })).journal;
    expect(journal.map((line) => [line.turn, line.camp, line.last, line.upcoming])).toEqual([
      [1, "A", true, false],
      [2, "B", false, true],
    ]);
  });
});

describe("describeEntry", () => {
  const base = { turn: 4, player: "B" as const };

  it("écrit un coup vu en entier", () => {
    const entry = { ...base, kind: "pawn", from: { x: 4, y: 7 }, to: { x: 4, y: 6 } };
    expect(describeEntry(m, entry)).toEqual({ text: "Pion 4,7 → 4,6", hidden: false });
  });

  it("met un ? à la place de ce que le joueur n'a pas vu", () => {
    const entry = { ...base, kind: "scout", to: { x: 1, y: 3 } };
    expect(describeEntry(m, entry).text).toBe("Éclaireur ? → 1,3");
  });

  it("efface un coup dont le joueur n'a rien vu", () => {
    expect(describeEntry(m, base)).toEqual({ text: "coup hors de vue", hidden: true });
  });

  it("dit une prise, et une perte sans rien voir venir", () => {
    const seen = {
      ...base,
      kind: "pawn",
      from: { x: 3, y: 4 },
      to: { x: 3, y: 5 },
      captured: "scout",
    };
    expect(describeEntry(m, seen).text).toBe("Pion 3,4 → 3,5, prend Éclaireur");
    expect(describeEntry(m, { ...base, to: { x: 3, y: 5 }, captured: "pawn" }).text).toBe(
      "Pion pris en 3,5",
    );
  });
});

describe("hudModel : nulle sans prise", () => {
  const near = (sinceCapture: number): PlayerView => ({
    ...startingView(),
    sinceCapture,
    noCaptureLimit: 60,
  });

  it("ne paraît qu'à l'approche du seuil", () => {
    expect(hudModel(m, input({ view: near(60 - DRAW_WARNING_MARGIN - 1) })).drawMeter).toBe(
      undefined,
    );
    expect(hudModel(m, input({ view: near(46) })).drawMeter).toMatchObject({
      count: "46 / 60",
      title: "Nulle proche",
    });
  });

  it("ne paraît jamais sous un ruleset sans cette nulle", () => {
    const view = { ...startingView(), sinceCapture: 59, noCaptureLimit: null };
    expect(hudModel(m, input({ view })).drawMeter).toBeUndefined();
  });
});

describe("hudModel : capacité du trappeur", () => {
  function trapperView(): PlayerView {
    const state = createGame(BOARD, provisionalRulesetV4(), [
      { id: "a-king", kind: "commander", owner: "A", coord: { x: 0, y: 0 } },
      { id: "a-trap", kind: "trapper", owner: "A", coord: { x: 2, y: 1 } },
      { id: "b-king", kind: "commander", owner: "B", coord: { x: 6, y: 0 } },
    ]);
    return viewFor(state, startMemory(state).knowledge.A);
  }
  const trapperSheet: PieceSheet = {
    piece: { id: "a-trap", kind: "trapper", owner: "A", coord: { x: 2, y: 1 } },
    relation: "own",
    role: "special",
    ability: "trap",
    steps: 2,
    adjacency: "octile",
    canClimb: true,
    lines: null,
    visionRange: 8,
    inCheck: false,
  };

  it("propose d'armer le piège, puis de revenir aux déplacements", () => {
    const view = trapperView();
    const trapper = view.ownPieces.find((piece) => piece.id === "a-trap");
    if (trapper === undefined) throw new Error("trappeur absent");
    const selection = selectionFor(view.legalActions, trapper);

    const idle = hudModel(m, input({ view, selection, sheet: trapperSheet })).sheet;
    expect(idle?.ability).toMatchObject({ aiming: false, action: m.game.hud.layTrap });
    expect(idle?.notes).toContain(m.game.pieceInfo.trap);

    const aimed = hudModel(
      m,
      input({ view, selection: aimAbility(selection, true), sheet: trapperSheet }),
    ).sheet;
    expect(aimed?.ability).toMatchObject({ aiming: true, action: m.game.hud.cancelTrap });
    expect(aimed?.reach?.traps).toBe(m.game.hud.traps(8));
  });

  it("ne donne aucun bouton à une pièce sans capacité", () => {
    const view = startingView();
    const scout = view.ownPieces.find((piece) => piece.id === "a-scout");
    if (scout === undefined) throw new Error("éclaireur absent");
    const selection = selectionFor(view.legalActions, scout);
    const sheet = hudModel(
      m,
      input({
        view,
        selection,
        sheet: { ...trapperSheet, ability: null, piece: { ...trapperSheet.piece, id: "a-scout" } },
      }),
    ).sheet;
    expect(sheet?.ability).toBeUndefined();
  });
});

describe("describeEntry : piège", () => {
  const base = { turn: 6, player: "A" as const };

  it("dit où l'on a posé son piège, et seulement qu'une capacité a servi chez l'adversaire", () => {
    const own = {
      ...base,
      kind: "trapper",
      from: { x: 2, y: 1 },
      ability: "trap" as const,
      target: { x: 3, y: 1 },
    };
    expect(describeEntry(m, own).text).toBe("Trappeur pose un piège en 3,1");
    const theirs = {
      ...base,
      player: "B" as const,
      kind: "trapper",
      from: { x: 2, y: 1 },
      ability: "trap" as const,
    };
    expect(describeEntry(m, theirs).text).toBe("Trappeur 2,1 prépare quelque chose");
  });

  it("dit la pièce prise au piège", () => {
    const entry = { ...base, kind: "pawn", to: { x: 3, y: 1 }, trapped: "pawn" };
    expect(describeEntry(m, entry).text).toBe("Pion ? → 3,1, Pion pris au piège");
  });
});

describe("trapNotice", () => {
  const sprung = {
    kind: "sprung" as const,
    coord: { x: 3, y: 1 },
    victim: { id: "b-pawn", kind: "pawn", owner: "B" as const, from: { x: 4, y: 1 } },
  };

  it("dit au poseur ce que son piège a pris, et à l'autre ce qu'il a perdu", () => {
    expect(trapNotice(m, [sprung], "A")).toBe("Votre piège en 3,1 a pris : Pion");
    expect(trapNotice(m, [sprung], "B")).toBe("Pris au piège en 3,1 : Pion");
  });

  it("se tait quand aucun piège n'a sauté", () => {
    expect(trapNotice(m, [{ kind: "laid", coord: { x: 3, y: 1 }, owner: "A" }], "A")).toBe(
      undefined,
    );
  });
});
