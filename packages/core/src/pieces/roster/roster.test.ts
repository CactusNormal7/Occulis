import { describe, expect, it } from "vitest";
import { Board } from "../../board.js";
import { PieceType } from "../piece-type.js";
import {
  Bishop,
  Commander,
  Pawn,
  Rook,
  Scout,
  provisionalRuleset,
  provisionalRulesetV0,
  provisionalRulesetV1,
  provisionalRulesetV2,
  provisionalRulesetV3,
  provisionalRulesetV4,
} from "./index.js";
import { lineReach } from "../profiles.js";

/**
 * Le roster est provisoire : ces vérifications portent sur des propriétés qui
 * doivent tenir quelles que soient les valeurs choisies, jamais sur les valeurs
 * elles-mêmes. Le comportement des règles est testé dans `piece-type.test.ts`.
 */

describe("roster provisoire", () => {
  it("distingue les pièces par capacité, jamais par robustesse", () => {
    const scout = new Scout();
    const commander = new Commander();

    expect(scout.movement.steps).toBeGreaterThan(commander.movement.steps);
    expect(scout.vision.range).toBeGreaterThan(commander.vision.range);
    expect(scout.isCommander).toBe(false);
    expect(commander.isCommander).toBe(true);
  });

  it("range chaque type dans son rôle d'équipe", () => {
    expect(new Commander().role).toBe("commander");
    expect(new Scout().role).toBe("special");
    expect(new Pawn().role).toBe("pawn");
    expect(new Pawn().isCommander).toBe(false);
  });

  it("fait du pion la pièce la plus myope", () => {
    const pawn = new Pawn();
    for (const other of [new Scout(), new Commander(), new Bishop(), new Rook()]) {
      expect(pawn.vision.range).toBeLessThan(other.vision.range);
    }
  });

  it("fait glisser le roi d'une case en diagonale et de deux en ligne droite", () => {
    const lines = new Commander().movement.lines ?? [];
    expect(lineReach(lines, "orthogonal")).toBe(2);
    expect(lineReach(lines, "diagonal")).toBe(1);
  });

  it("fait du fou et de la tour des pièces basiques, sans capacité ni limite", () => {
    const bishop = new Bishop().movement.lines ?? [];
    const rook = new Rook().movement.lines ?? [];
    expect(lineReach(bishop, "diagonal")).toBe(Infinity);
    expect(lineReach(bishop, "orthogonal")).toBe(0);
    expect(lineReach(rook, "orthogonal")).toBe(Infinity);
    expect(lineReach(rook, "diagonal")).toBe(0);
    expect(new Bishop().ability).toBeNull();
    expect(new Rook().ability).toBeNull();
  });

  it("hérite du comportement commun", () => {
    for (const type of [new Scout(), new Commander(), new Pawn()]) {
      expect(type).toBeInstanceOf(PieceType);
      expect(type.canSee(Board.flat(3, 1), { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
    }
  });

  it("voit toute la carte de démonstration, l'occultation exceptée", () => {
    // Portées volontairement généreuses : sur une carte d'une dizaine de cases de
    // côté, seul le relief limite la vue. C'est ce qui rend la LOS observable.
    const wide = Board.flat(10, 8);

    for (const type of [new Scout(), new Commander()]) {
      expect(type.fieldOfView(wide, { x: 0, y: 0 }).size).toBe(wide.tileCount);
    }
  });

  it("indexe chaque type par son kind", () => {
    const ruleset = provisionalRuleset();

    expect(ruleset.kinds().sort()).toEqual(["bishop", "commander", "pawn", "rook", "trapper"]);
    expect(ruleset.kindsOf("special")).toEqual(["bishop", "rook", "trapper"]);
    expect(provisionalRulesetV4().kinds().sort()).toEqual([
      "commander",
      "pawn",
      "scout",
      "trapper",
    ]);
    expect(ruleset.get("trapper").ability).toBe("trap");
    expect(provisionalRulesetV3().kinds().sort()).toEqual(["commander", "pawn", "scout"]);
    expect(ruleset.kindsOf("pawn")).toEqual(["pawn"]);
    expect(ruleset.team).toEqual({ commander: 1, special: 3, pawn: 2 });
    expect(provisionalRulesetV1().kinds().sort()).toEqual(["commander", "pawn", "scout"]);
    expect(provisionalRulesetV1().team).toEqual({ commander: 1, special: 3, pawn: 4 });
    expect(provisionalRulesetV0().kinds().sort()).toEqual(["commander", "scout"]);
    expect(provisionalRulesetV0().team).toBeNull();
    expect(provisionalRulesetV2().team).toEqual({ commander: 1, special: 3, pawn: 2 });
    expect(provisionalRulesetV2().get("scout")).not.toBeInstanceOf(Scout);
    expect(provisionalRulesetV4().get("scout")).toBeInstanceOf(Scout);
    expect(ruleset.get("rook")).toBeInstanceOf(Rook);
    expect(
      ruleset.typeOf({ id: "x", kind: "commander", owner: "A", coord: { x: 0, y: 0 } }),
    ).toBeInstanceOf(Commander);
    expect(() => ruleset.get("inconnu")).toThrow();
  });
});
