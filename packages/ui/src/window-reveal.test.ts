import { describe, expect, it } from "vitest";
import { CLOSE_MS, OPEN_MS, frameAt, originIn, spreadAt } from "./window-reveal.js";

describe("spreadAt", () => {
  it("ouvre continûment d'un point jusqu'à la fenêtre entière", () => {
    expect(spreadAt(0, "open")).toBe(0);
    let previous = 0;
    for (let t = 0; t <= OPEN_MS; t += 10) {
      const spread = spreadAt(t, "open");
      expect(spread).toBeGreaterThanOrEqual(previous);
      previous = spread;
    }
    expect(spreadAt(OPEN_MS, "open")).toBe(1);
  });

  it("referme jusqu'au point, plus vite qu'elle n'ouvre", () => {
    expect(spreadAt(0, "close")).toBe(1);
    expect(spreadAt(CLOSE_MS, "close")).toBe(0);
    expect(CLOSE_MS).toBeLessThan(OPEN_MS);
  });
});

describe("originIn", () => {
  it("part du pointeur, ramené sur les bords s'il est dehors", () => {
    expect(originIn(200, 100, { x: 30, y: 40 })).toEqual({ x: 30, y: 40 });
    expect(originIn(200, 100, { x: -50, y: 400 })).toEqual({ x: 0, y: 100 });
  });

  it("part du centre sans pointeur connu", () => {
    expect(originIn(200, 100, null)).toEqual({ x: 100, y: 50 });
  });
});

describe("frameAt", () => {
  const origin = { x: 20, y: 80 };

  it("est un point sous la souris au départ, la fenêtre entière à la fin", () => {
    expect(frameAt(0, origin, 200, 100)).toEqual({ left: 20, top: 80, right: 20, bottom: 80 });
    expect(frameAt(1, origin, 200, 100)).toEqual({ left: 0, top: 0, right: 200, bottom: 100 });
  });

  it("contient toujours le point de départ", () => {
    for (const spread of [0.1, 0.4, 0.7]) {
      const frame = frameAt(spread, origin, 200, 100);
      expect(frame.left).toBeLessThanOrEqual(origin.x);
      expect(frame.right).toBeGreaterThanOrEqual(origin.x);
      expect(frame.top).toBeLessThanOrEqual(origin.y);
      expect(frame.bottom).toBeGreaterThanOrEqual(origin.y);
    }
  });
});
