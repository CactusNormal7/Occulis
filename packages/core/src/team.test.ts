import { describe, expect, it } from "vitest";
import { type Coord } from "./coord.js";
import { provisionalRuleset, provisionalRulesetV0 } from "./pieces/index.js";
import { type TeamEntry, deployTeams, parseTeam, translateTeam, validateTeam } from "./team.js";

const ZONE: Coord[] = Array.from({ length: 12 }, (_, index) => ({ x: index % 4, y: Math.floor(index / 4) }));

const TEAM: TeamEntry[] = [
  { kind: "commander", coord: { x: 0, y: 0 } },
  { kind: "scout", coord: { x: 1, y: 0 } },
  { kind: "scout", coord: { x: 2, y: 0 } },
  { kind: "scout", coord: { x: 3, y: 0 } },
  { kind: "pawn", coord: { x: 0, y: 1 } },
  { kind: "pawn", coord: { x: 1, y: 1 } },
  { kind: "pawn", coord: { x: 2, y: 1 } },
  { kind: "pawn", coord: { x: 3, y: 1 } },
];

describe("validateTeam", () => {
  const ruleset = provisionalRuleset();

  it("accepte une maîtresse, trois pièces à capacité et quatre pions dans la zone", () => {
    expect(validateTeam(ruleset, ZONE, TEAM).ok).toBe(true);
  });

  it("exige exactement les quotas de chaque rôle", () => {
    const twoCommanders = TEAM.map((entry, index) => (index === 1 ? { ...entry, kind: "commander" } : entry));
    expect(validateTeam(ruleset, ZONE, twoCommanders)).toEqual({
      ok: false,
      error: { code: "wrong-count", role: "commander", expected: 1, actual: 2 },
    });
    expect(validateTeam(ruleset, ZONE, TEAM.slice(0, 7))).toMatchObject({ ok: false, error: { code: "wrong-count", role: "pawn" } });
  });

  it("refuse un type inconnu du ruleset", () => {
    const unknown = TEAM.map((entry, index) => (index === 1 ? { ...entry, kind: "dragon" } : entry));
    expect(validateTeam(ruleset, ZONE, unknown)).toEqual({ ok: false, error: { code: "unknown-kind", kind: "dragon" } });
  });

  it("refuse une case hors de la zone, et deux pièces sur la même case", () => {
    const outside = TEAM.map((entry, index) => (index === 0 ? { ...entry, coord: { x: 9, y: 9 } } : entry));
    expect(validateTeam(ruleset, ZONE, outside)).toEqual({ ok: false, error: { code: "outside-zone", coord: { x: 9, y: 9 } } });
    const stacked = TEAM.map((entry, index) => (index === 1 ? { ...entry, coord: { x: 0, y: 0 } } : entry));
    expect(validateTeam(ruleset, ZONE, stacked)).toEqual({ ok: false, error: { code: "same-tile", coord: { x: 0, y: 0 } } });
  });

  it("refuse tout déploiement sous un ruleset sans composition", () => {
    expect(validateTeam(provisionalRulesetV0(), ZONE, TEAM)).toEqual({ ok: false, error: { code: "no-team-rules" } });
  });
});

describe("deployTeams", () => {
  const ruleset = provisionalRuleset();
  const mirrored: TeamEntry[] = TEAM.map((entry) => ({ ...entry, coord: { x: entry.coord.x, y: entry.coord.y + 10 } }));
  const deployment = {
    zones: { A: ZONE, B: ZONE.map((coord) => ({ x: coord.x, y: coord.y + 10 })) },
    defaultTeams: { A: TEAM, B: mirrored },
  };

  it("tire les identifiants de l'ordre des entrées, sans rien d'aléatoire", () => {
    const first = deployTeams(ruleset, deployment, { A: TEAM, B: mirrored });
    const second = deployTeams(ruleset, deployment, { A: TEAM, B: mirrored });
    expect(first).toEqual(second);
    expect(first.ok && first.value.map((piece) => piece.id)).toEqual([
      "a-0", "a-1", "a-2", "a-3", "a-4", "a-5", "a-6", "a-7",
      "b-0", "b-1", "b-2", "b-3", "b-4", "b-5", "b-6", "b-7",
    ]);
    expect(first.ok && first.value[0]).toEqual({ id: "a-0", kind: "commander", owner: "A", coord: { x: 0, y: 0 } });
  });

  it("dit quel camp a envoyé une équipe invalide", () => {
    expect(deployTeams(ruleset, deployment, { A: TEAM, B: TEAM })).toMatchObject({
      ok: false,
      error: { player: "B", error: { code: "outside-zone" } },
    });
  });
});

describe("parseTeam", () => {
  it("lit une liste bien formée", () => {
    expect(parseTeam(JSON.parse(JSON.stringify(TEAM)))).toEqual(TEAM);
  });

  it("refuse ce qui n'a pas la forme d'une équipe", () => {
    for (const junk of [null, "x", {}, [1], [{ kind: "pawn" }], [{ kind: "", coord: { x: 0, y: 0 } }], [{ kind: "pawn", coord: { x: 0.5, y: 0 } }], [{ kind: 3, coord: { x: 0, y: 0 } }]]) {
      expect(parseTeam(junk)).toBeUndefined();
    }
    expect(parseTeam(Array.from({ length: 65 }, () => TEAM[0]))).toBeUndefined();
  });
});

describe("translateTeam", () => {
  it("transpose case pour case, et laisse en place ce qui sort de la zone", () => {
    const to = ZONE.map((coord) => ({ x: 20 - coord.x, y: 20 - coord.y }));
    const moved = translateTeam([{ kind: "pawn", coord: { x: 1, y: 0 } }, { kind: "pawn", coord: { x: 9, y: 9 } }], ZONE, to);
    expect(moved).toEqual([
      { kind: "pawn", coord: { x: 19, y: 20 } },
      { kind: "pawn", coord: { x: 9, y: 9 } },
    ]);
  });
});
