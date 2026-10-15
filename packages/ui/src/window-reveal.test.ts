import { describe, expect, it } from "vitest";
import { CLOSE_MS, OPEN_MS, eyeAt } from "./window-reveal.js";

describe("eyeAt — l'ouverture", () => {
  it("trace d'abord le trait, paupières closes", () => {
    const early = eyeAt(60, "open");
    expect(early.line).toBeGreaterThan(0);
    expect(early.line).toBeLessThan(1);
    expect(early.open).toBe(0);
    expect(early.glow).toBe(1);
  });

  it("ouvre ensuite les paupières continûment, jusqu'à la fenêtre entière", () => {
    let previous = 0;
    for (let t = 0; t <= OPEN_MS; t += 10) {
      const { open } = eyeAt(t, "open");
      expect(open).toBeGreaterThanOrEqual(previous);
      expect(open - previous).toBeLessThan(0.1);
      previous = open;
    }
    expect(eyeAt(OPEN_MS, "open")).toEqual({ line: 1, open: 1, glow: 0 });
  });
});

describe("eyeAt — la fermeture", () => {
  it("referme les paupières, puis résorbe le trait", () => {
    expect(eyeAt(0, "close").open).toBe(1);
    const shut = eyeAt(205, "close");
    expect(shut.open).toBe(0);
    expect(shut.line).toBeGreaterThan(0);
    expect(eyeAt(CLOSE_MS, "close").line).toBe(0);
  });

  it("referme plus vite qu'elle n'ouvre", () => {
    expect(CLOSE_MS).toBeLessThan(OPEN_MS);
  });
});
