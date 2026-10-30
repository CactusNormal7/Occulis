import { coordKey } from "@occulis/core";
import { describe, expect, it } from "vitest";
import { FRAMES, SCRIPT, VIEWER, buildFrames } from "./script";

const opponents = (frame: ReturnType<typeof buildFrames>[number]) =>
  [...frame.state.pieces.values()].filter((piece) => piece.owner !== VIEWER);

describe("le scénario du hero", () => {
  // Le hero ne doit jamais montrer un coup que le jeu refuserait : si `core` change ses
  // règles, ce test casse avant le site.
  it("se joue entièrement avec des coups légaux", () => {
    expect(buildFrames()).toHaveLength(SCRIPT.length + 1);
  });

  it("cache le camp adverse au départ", () => {
    const frame = buildFrames()[FRAMES.fog]!;
    expect(
      opponents(frame).some((piece) => frame.knowledge.visible.has(coordKey(piece.coord))),
    ).toBe(false);
  });

  it("découvre tout le camp adverse, roi compris, du haut du col", () => {
    const frame = buildFrames()[FRAMES.summit]!;
    for (const piece of opponents(frame)) {
      expect(frame.knowledge.visible.has(coordKey(piece.coord))).toBe(true);
    }
  });

  it("n'en garde que des fantômes une fois redescendu", () => {
    const frame = buildFrames()[FRAMES.ghosts]!;
    expect(
      opponents(frame).some((piece) => frame.knowledge.visible.has(coordKey(piece.coord))),
    ).toBe(false);
    expect(frame.knowledge.remembered.size).toBe(opponents(frame).length);
  });
});
