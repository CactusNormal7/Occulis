import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VEIL_MS, VEIL_SWAP_MS } from "./veil.js";

/**
 * Le voile tramé est acté tel quel par le porteur du projet (docs/design.md 8.1) : ce test
 * échoue à la moindre retouche, pour qu'elle ne passe jamais par mégarde. Le modifier exige
 * son accord explicite.
 */
const css = readFileSync(new URL("./ui.css", import.meta.url), "utf8");

const LOCKED = `.theme-veil {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: repeating-conic-gradient(var(--occ-bg) 0 25%, transparent 0 50%) 0 0 / 4px 4px;
  pointer-events: none;
  animation: theme-veil 520ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

@keyframes theme-veil {
  from {
    clip-path: inset(0 100% 0 0);
  }
  45% {
    clip-path: inset(0 0 0 0);
  }
  to {
    clip-path: inset(0 0 0 100%);
  }
}`;

describe("le voile tramé", () => {
  it("garde sa feuille à l'identique", () => {
    expect(css).toContain(LOCKED);
  });

  it("garde ses durées, et bascule sous un écran déjà couvert", () => {
    expect(VEIL_MS).toBe(520);
    expect(VEIL_SWAP_MS).toBe(200);
    expect(css).toContain(`animation: theme-veil ${VEIL_MS}ms`);
  });
});
