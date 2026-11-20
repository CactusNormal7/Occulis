import { describe, expect, it } from "vitest";
import { coordKey } from "../coord.js";
import { hasLineOfSight } from "../los.js";
import { provisionalRuleset } from "../pieces/index.js";
import { createGame } from "../state.js";
import { deployTeams, teamForSide, validateTeam } from "../team.js";
import { DEFAULT_SCENARIO, scenarioFor } from "./index.js";

const breach = scenarioFor("breach-1");
const board = breach.board();
const deployment = breach.deployment as NonNullable<typeof breach.deployment>;

describe("breach-1", () => {
  it("est la carte des nouvelles parties", () => {
    expect(DEFAULT_SCENARIO).toBe("breach-1");
  });

  it("donne à chaque camp une zone franchissable plus large que son équipe", () => {
    for (const player of ["A", "B"] as const) {
      const zone = deployment.zones[player];
      expect(new Set(zone.map(coordKey)).size).toBe(zone.length);
      expect(zone.length).toBeGreaterThan(8);
      for (const coord of zone) expect(board.isPassable(coord)).toBe(true);
    }
  });

  it("est symétrique par rapport à son centre, cases manquantes comprises", () => {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        expect(board.heightAt({ x, y })).toBe(board.heightAt({ x: 8 - x, y: 8 - y }));
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
