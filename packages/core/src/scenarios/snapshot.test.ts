import { describe, expect, it } from "vitest";
import { frozenScenario, scenarioFor, snapshotScenario } from "./index.js";

describe("cartes figées", () => {
  it("reconstruit la même carte après un aller-retour par JSON", () => {
    const ridge = scenarioFor("ridge-1");
    const frozen = frozenScenario("ridge-1", JSON.parse(JSON.stringify(snapshotScenario(ridge))));

    expect([...frozen.board().allTiles()]).toEqual([...ridge.board().allTiles()]);
    expect(frozen.deployment).toEqual(ridge.deployment);
    expect(frozen.pieces).toEqual(ridge.pieces);
  });

  it("garde la carte figée même si le registre change sous le même nom", () => {
    const snapshot = snapshotScenario(scenarioFor("ridge-1"));
    const edited = { ...snapshot, tiles: snapshot.tiles.map((tile) => ({ ...tile, height: 0 })) };

    expect(frozenScenario("ridge-1", edited).board().heightAt({ x: 1, y: 0 })).toBe(0);
    expect(scenarioFor("ridge-1").board().heightAt({ x: 1, y: 0 })).toBe(3);
  });

  it("retombe sur le registre pour une partie d'avant les cartes figées", () => {
    expect(frozenScenario("demo-0", null)).toBe(scenarioFor("demo-0"));
  });
});
