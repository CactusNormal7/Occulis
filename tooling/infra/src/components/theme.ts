import type { Level } from "../actions.js";

export const ACCENT = "#7aa2f7";

export const LEVEL_COLOR: Record<Level, string> = {
  info: "white",
  ok: "green",
  warn: "yellow",
  fail: "red",
  step: "cyan",
  raw: "gray",
};

export const LEVEL_PREFIX: Record<Level, string> = {
  info: "  ",
  ok: "✔ ",
  warn: "▲ ",
  fail: "✖ ",
  step: "▸ ",
  raw: "  ",
};
