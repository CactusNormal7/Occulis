import { isMotionLevel, isThemeName, type MotionLevel, type ThemeName } from "../src/tokens.js";

/**
 * Les réglages du labo : ce que fera un jour la surcharge du back-office — un thème, un niveau
 * d'intensité et des propriétés `--occ-*` posés sur la racine du document, à chaud. Rien n'est
 * enregistré hors de ce navigateur.
 */
export interface Knobs {
  theme: ThemeName;
  motion: MotionLevel;
  overrides: Record<string, string>;
}

const STORAGE_KEY = "occulis.lab";

export function defaultKnobs(): Knobs {
  return { theme: "obsidian", motion: "full", overrides: {} };
}

export function loadKnobs(): Knobs {
  const fallback = defaultKnobs();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Knobs> | null;
    if (raw === null) return fallback;
    return {
      theme: isThemeName(raw.theme) ? raw.theme : fallback.theme,
      motion: isMotionLevel(raw.motion) ? raw.motion : fallback.motion,
      overrides: typeof raw.overrides === "object" && raw.overrides !== null ? raw.overrides : {},
    };
  } catch {
    return fallback;
  }
}

export function saveKnobs(knobs: Knobs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(knobs));
  } catch {
    // Stockage indisponible : les réglages valent pour la session.
  }
}

/** Pose les réglages sur la racine du document, en retirant les surcharges précédentes. */
export function applyKnobs(knobs: Knobs): void {
  const root = document.documentElement;
  root.dataset.theme = knobs.theme;
  if (knobs.motion === "full") delete root.dataset.motion;
  else root.dataset.motion = knobs.motion;
  for (const name of [...root.style].filter((property) => property.startsWith("--occ-")))
    root.style.removeProperty(name);
  for (const [name, value] of Object.entries(knobs.overrides)) root.style.setProperty(name, value);
}
