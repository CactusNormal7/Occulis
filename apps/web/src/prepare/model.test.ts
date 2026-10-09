import { describe, expect, it } from "vitest";
import { scenarioFor } from "@occulis/core";
import type { TeamPreset } from "@occulis/protocol";
import { initialTeam, remainingAt, secondsLeft, shouldAutoSend, usablePresets } from "./model.js";

const deployment = scenarioFor("ridge-1").deployment;
if (deployment === undefined) throw new Error("ridge-1 sans déploiement");

const preset = (overrides: Partial<TeamPreset>): TeamPreset => ({
  id: "p",
  name: "Mur",
  scenario: "ridge-1",
  rulesetVersion: "provisional-1",
  team: deployment.defaultTeams.A,
  isDefault: true,
  valid: true,
  updatedAt: 0,
  ...overrides,
});

describe("compte à rebours", () => {
  it("décompte depuis l'arrivée du message, sur l'horloge du client", () => {
    expect(remainingAt(15_000, 1000, 1000)).toBe(15_000);
    expect(remainingAt(15_000, 1000, 6000)).toBe(10_000);
    expect(remainingAt(15_000, 1000, 99_000)).toBe(0);
    expect(secondsLeft(10_001)).toBe(11);
    expect(secondsLeft(0)).toBe(0);
  });

  it("n'envoie de lui-même qu'un brouillon valide, non verrouillé, une seule fois, juste avant l'échéance", () => {
    expect(shouldAutoSend(1000, true, false, false)).toBe(true);
    expect(shouldAutoSend(5000, true, false, false)).toBe(false);
    expect(shouldAutoSend(1000, false, false, false)).toBe(false);
    expect(shouldAutoSend(1000, true, true, false)).toBe(false);
    expect(shouldAutoSend(1000, true, false, true)).toBe(false);
  });
});

describe("équipe préchargée", () => {
  it("prend le preset par défaut, transposé au camp tenu", () => {
    expect(initialTeam([preset({})], "ridge-1", "provisional-1", "B", [])).toEqual(deployment.defaultTeams.B);
  });

  it("retombe sur l'équipe de la carte sans preset jouable", () => {
    const fallback = deployment.defaultTeams.A;
    expect(initialTeam([preset({ valid: false })], "ridge-1", "provisional-1", "A", fallback)).toBe(fallback);
    expect(initialTeam([preset({ isDefault: false })], "ridge-1", "provisional-1", "A", fallback)).toBe(fallback);
    expect(usablePresets([preset({ rulesetVersion: "provisional-0" }), preset({ scenario: "demo-0" })], "ridge-1", "provisional-1")).toEqual([]);
  });
});
