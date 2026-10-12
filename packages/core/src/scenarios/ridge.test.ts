import { describe, expect, it } from "vitest";
import { coordKey } from "../coord.js";
import { hasLineOfSight } from "../los.js";
import { provisionalRuleset } from "../pieces/index.js";
import { createGame } from "../state.js";
import { deployTeams, teamForSide, validateTeam } from "../team.js";
import { DEFAULT_SCENARIO, scenarioFor } from "./index.js";

const ridge = scenarioFor("ridge-1");
const board = ridge.board();
const deployment = ridge.deployment as NonNullable<typeof ridge.deployment>;

describe("ridge-1", () => {
  it("est la carte des nouvelles parties", () => {
    expect(DEFAULT_SCENARIO).toBe("ridge-1");
  });

  it("donne à chaque camp une zone franchissable plus large que son équipe", () => {
    for (const player of ["A", "B"] as const) {
      const zone = deployment.zones[player];
      expect(new Set(zone.map(coordKey)).size).toBe(zone.length);
      expect(zone.length).toBeGreaterThan(8);
      for (const coord of zone) expect(board.isPassable(coord)).toBe(true);
    }
  });

  it("est symétrique par rapport à son centre", () => {
    for (const tile of board.allTiles()) {
      const opposite = board.getTile({ x: 13 - tile.coord.x, y: 9 - tile.coord.y });
      expect(opposite?.height).toBe(tile.height);
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
      expect(validateTeam(ruleset, deployment.zones[player], deployment.defaultTeams[player]).ok).toBe(true);
    }
    const pieces = deployTeams(ruleset, deployment, deployment.defaultTeams);
    expect(pieces.ok).toBe(true);
    if (pieces.ok) expect(() => createGame(board, ruleset, pieces.value)).not.toThrow();
  });
});

describe("ridge-1 : équipe écrite pour le camp A", () => {
  it("se pose à l'identique, en miroir, dans la zone du camp B", () => {
    expect(teamForSide(deployment, deployment.defaultTeams.A, "B")).toEqual(deployment.defaultTeams.B);
    expect(teamForSide(deployment, deployment.defaultTeams.A, "A")).toEqual(deployment.defaultTeams.A);
  });
});
