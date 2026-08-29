import { describe, expect, it } from "vitest";
import { Board } from "../../board.js";
import { PieceType } from "../piece-type.js";
import { Commander, Scout, provisionalRuleset } from "./index.js";

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

  it("hérite du comportement commun", () => {
    for (const type of [new Scout(), new Commander()]) {
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

    expect(ruleset.kinds().sort()).toEqual(["commander", "scout"]);
    expect(ruleset.get("scout")).toBeInstanceOf(Scout);
    expect(
      ruleset.typeOf({ id: "x", kind: "commander", owner: "A", coord: { x: 0, y: 0 } }),
    ).toBeInstanceOf(Commander);
    expect(() => ruleset.get("inconnu")).toThrow();
  });
});
