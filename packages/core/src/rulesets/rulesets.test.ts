import { describe, expect, it } from "vitest";
import { CURRENT_RULESET_VERSION, rulesetFor } from "./index.js";

describe("registre des rulesets", () => {
  it("garde chargeables les versions des parties déjà jouées", () => {
    expect(rulesetFor("provisional-0").team).toBeNull();
    expect(rulesetFor("provisional-0").has("pawn")).toBe(false);
    expect(rulesetFor("provisional-1").team).toEqual({ commander: 1, special: 3, pawn: 4 });
  });

  it("laisse les parties d'avant la prise sous leurs règles et leurs portées", () => {
    for (const version of ["provisional-0", "provisional-1", "provisional-2"]) {
      const ruleset = rulesetFor(version);
      expect(ruleset.rules).toEqual({ capture: false, check: false, draws: null });
      expect(ruleset.get("scout").movement.steps).toBe(6);
      expect(ruleset.get("commander").movement.steps).toBe(3);
    }
  });

  it("donne à la version courante la prise, l'échec et les nulles", () => {
    const ruleset = rulesetFor(CURRENT_RULESET_VERSION);
    expect(ruleset.rules).toEqual({
      capture: true,
      check: true,
      draws: { repetition: 3, withoutCapture: 60 },
    });
    expect(ruleset.has("scout")).toBe(false);
    expect(ruleset.get("bishop").movement.lines).toHaveLength(4);
    expect(ruleset.get("rook").movement.lines).toHaveLength(4);
    expect(ruleset.get("pawn").movement.steps).toBe(2);
  });

  it("garde aux parties de provisional-3 et 4 leur roi et leur pion d'un pas", () => {
    for (const version of ["provisional-3", "provisional-4"]) {
      const ruleset = rulesetFor(version);
      expect(ruleset.get("scout").movement.steps).toBe(3);
      expect(ruleset.get("commander").movement).toEqual({
        steps: 1,
        adjacency: "octile",
        canClimb: true,
      });
      expect(ruleset.get("pawn").movement.steps).toBe(1);
    }
  });

  it("fait de la version courante celle du déploiement", () => {
    expect(CURRENT_RULESET_VERSION).toBe("provisional-5");
    expect(rulesetFor(CURRENT_RULESET_VERSION).team).toEqual({
      commander: 1,
      special: 3,
      pawn: 2,
    });
  });

  it("ne donne le trappeur qu'aux parties depuis provisional-4", () => {
    expect(rulesetFor("provisional-3").has("trapper")).toBe(false);
    expect(rulesetFor("provisional-4").get("trapper").ability).toBe("trap");
    expect(rulesetFor("provisional-5").get("trapper").ability).toBe("trap");
  });

  it("refuse une version inconnue", () => {
    expect(() => rulesetFor("provisional-99")).toThrow();
  });
});
