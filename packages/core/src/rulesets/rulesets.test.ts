import { describe, expect, it } from "vitest";
import { CURRENT_RULESET_VERSION, rulesetFor } from "./index.js";

describe("registre des rulesets", () => {
  it("garde chargeables les versions des parties déjà jouées", () => {
    expect(rulesetFor("provisional-0").team).toBeNull();
    expect(rulesetFor("provisional-0").has("pawn")).toBe(false);
  });

  it("fait de la version courante celle du déploiement", () => {
    expect(CURRENT_RULESET_VERSION).toBe("provisional-1");
    expect(rulesetFor(CURRENT_RULESET_VERSION).team).not.toBeNull();
  });

  it("refuse une version inconnue", () => {
    expect(() => rulesetFor("provisional-99")).toThrow();
  });
});
