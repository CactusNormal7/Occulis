import { describe, expect, it } from "vitest";
import { coordKey } from "../coord.js";
import { hasLineOfSight } from "../los.js";
import { provisionalRuleset } from "../pieces/index.js";
import { createGame } from "../state.js";
import { deployTeams, teamForSide, validateTeam } from "../team.js";
import { DEFAULT_SCENARIO, scenarioFor } from "./index.js";

it("fait de breach-2 la carte des nouvelles parties", () => {
  expect(DEFAULT_SCENARIO).toBe("breach-2");
});

describe.each([
  { name: "breach-1", size: 9 },
  { name: "breach-2", size: 11 },
])("$name", ({ name, size }) => {
  const breach = scenarioFor(name);
  const board = breach.board();
  const deployment = breach.deployment as NonNullable<typeof breach.deployment>;

  it("donne à chaque camp une zone franchissable plus large que son équipe", () => {
    for (const player of ["A", "B"] as const) {
      const zone = deployment.zones[player];
      expect(new Set(zone.map(coordKey)).size).toBe(zone.length);
      expect(zone.length).toBeGreaterThan(8);
      for (const coord of zone) expect(board.isPassable(coord)).toBe(true);
    }
  });

  it("est symétrique par rapport à son centre, cases manquantes comprises", () => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const opposite = { x: size - 1 - x, y: size - 1 - y };
        expect(board.heightAt({ x, y })).toBe(board.heightAt(opposite));
      }
    }
  });

  it("ne laisse aucune ligne de vue entre les deux zones, sur le seul relief", () => {
    // C'est ce qui cache le placement adverse (docs/design.md section 7) : sans pièce
    // pour occulter, aucune case d'une zone ne voit une case de l'autre.
    for (const from of deployment.zones.A) {
      for (const to of deployment.zones.B) expect(hasLineOfSight(board, from, to)).toBe(false);
    }
  });

  it("pose des équipes par défaut valides, qui forment une position de départ", () => {
    const ruleset = provisionalRuleset();
    for (const player of ["A", "B"] as const) {
      expect(
        validateTeam(ruleset, deployment.zones[player], deployment.defaultTeams[player]).ok,
      ).toBe(true);
    }
    const pieces = deployTeams(ruleset, deployment, deployment.defaultTeams);
    expect(pieces.ok).toBe(true);
    if (pieces.ok) expect(() => createGame(board, ruleset, pieces.value)).not.toThrow();
  });

  it("pose une équipe écrite pour le camp A à l'identique, en miroir, chez le camp B", () => {
    expect(teamForSide(deployment, deployment.defaultTeams.A, "B")).toEqual(
      deployment.defaultTeams.B,
    );
  });
});

describe("breach-2", () => {
  const board = scenarioFor("breach-2").board();

  it("mesure deux cases de plus que breach-1 dans chaque sens, sans relief plus haut", () => {
    const tiles = [...board.allTiles()];
    expect(Math.max(...tiles.map((tile) => tile.coord.x)) + 1).toBe(11);
    expect(Math.max(...tiles.map((tile) => tile.coord.y)) + 1).toBe(11);
    expect(Math.max(...tiles.map((tile) => tile.height))).toBeLessThan(3);
  });
});
