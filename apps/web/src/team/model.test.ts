import { describe, expect, it } from "vitest";
import { provisionalRuleset, scenarioFor } from "@occulis/core";
import { autoFill, clear, clickTile, emptyDraft, fromEntries, isComplete, placedCount, remove, setKind, toEntries, verdict } from "./model.js";

const ruleset = provisionalRuleset();
const deployment = scenarioFor("ridge-1").deployment;
if (deployment === undefined) throw new Error("ridge-1 sans déploiement");
const zone = deployment.zones.A;

describe("brouillon d'équipe", () => {
  it("ouvre les emplacements de la composition, la maîtresse en main", () => {
    const draft = emptyDraft(ruleset);
    expect(draft.slots.map((slot) => slot.role)).toEqual(["commander", "special", "special", "special", "pawn", "pawn", "pawn", "pawn"]);
    expect(draft.slots.every((slot) => slot.coord === undefined)).toBe(true);
    expect(draft.selected).toBe(0);
  });

  it("pose la pièce en main sur une case de la zone, puis prend la suivante", () => {
    const placed = clickTile(emptyDraft(ruleset), { x: 0, y: 9 }, zone);
    expect(placed.slots[0]?.coord).toEqual({ x: 0, y: 9 });
    expect(placed.selected).toBe(1);
  });

  it("ignore une case hors de la zone", () => {
    const draft = emptyDraft(ruleset);
    expect(clickTile(draft, { x: 13, y: 0 }, zone)).toBe(draft);
  });

  it("prend une pièce posée, puis l'échange avec celle de la case visée", () => {
    let draft = clickTile(emptyDraft(ruleset), { x: 0, y: 9 }, zone);
    draft = clickTile(draft, { x: 1, y: 9 }, zone);
    // Main vide sur la maîtresse : on la reprend…
    draft = clickTile({ ...draft, selected: undefined }, { x: 0, y: 9 }, zone);
    expect(draft.selected).toBe(0);
    // … et posée sur l'éclaireur, les deux échangent leurs cases.
    draft = clickTile(draft, { x: 1, y: 9 }, zone);
    expect(draft.slots[0]?.coord).toEqual({ x: 1, y: 9 });
    expect(draft.slots[1]?.coord).toEqual({ x: 0, y: 9 });
  });

  it("ne change le type d'un emplacement que dans son rôle", () => {
    const draft = emptyDraft(ruleset);
    expect(setKind(draft, ruleset, 1, "pawn")).toBe(draft);
    expect(setKind(draft, ruleset, 1, "scout").slots[1]?.kind).toBe("scout");
  });

  it("se remplit depuis une équipe, et la rend à l'identique", () => {
    const draft = fromEntries(ruleset, deployment.defaultTeams.A);
    expect(isComplete(draft)).toBe(true);
    expect(new Set(toEntries(draft).map((entry) => `${entry.kind}@${entry.coord.x},${entry.coord.y}`))).toEqual(
      new Set(deployment.defaultTeams.A.map((entry) => `${entry.kind}@${entry.coord.x},${entry.coord.y}`)),
    );
    expect(verdict(ruleset, zone, draft).ok).toBe(true);
  });

  it("laisse la règle juger un brouillon incomplet", () => {
    const partial = clickTile(emptyDraft(ruleset), { x: 0, y: 9 }, zone);
    expect(verdict(ruleset, zone, partial)).toMatchObject({ ok: false, error: { code: "wrong-count" } });
  });

  it("complète, retire et vide", () => {
    const full = autoFill(clickTile(emptyDraft(ruleset), { x: 3, y: 9 }, zone), zone);
    expect(isComplete(full)).toBe(true);
    expect(full.slots[0]?.coord).toEqual({ x: 3, y: 9 });
    expect(verdict(ruleset, zone, full).ok).toBe(true);
    const lifted = remove(full, 2);
    expect(placedCount(lifted)).toBe(7);
    expect(lifted.selected).toBe(2);
    expect(placedCount(clear(full))).toBe(0);
  });
});
