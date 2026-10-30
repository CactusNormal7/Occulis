import { describe, expect, it } from "vitest";
import { CURRENT_RULESET_VERSION, rulesetFor } from "./index.js";

describe("registre des rulesets", () => {
  it("garde chargeables les versions des parties déjà jouées", () => {
    expect(rulesetFor("provisional-0").team).toBeNull();
    expect(rulesetFor("provisional-0").has("pawn")).toBe(false);
    expect(rulesetFor("provisional-1").team).toEqual({ commander: 1, special: 3, pawn: 4 });
  });

  it("fait de la version courante celle du déploiement", () => {
    expect(CURRENT_RULESET_VERSION).toBe("provisional-2");
    expect(rulesetFor(CURRENT_RULESET_VERSION).team).toEqual({
      commander: 1,
      special: 3,
      pawn: 2,
    });
  });

  it("refuse une version inconnue", () => {
    expect(() => rulesetFor("provisional-99")).toThrow();
  });
});
