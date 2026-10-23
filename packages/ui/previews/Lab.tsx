import { useEffect, useState, type ReactNode } from "react";
import { Button, Segmented, UiRoot, Wordmark } from "../src/index.js";
import {
  MOTION_LEVEL_NAMES,
  PROPOSED,
  THEME_NAMES,
  isMotionLevel,
  isThemeName,
  type MotionLevel,
  type ThemeName,
} from "../src/tokens.js";
import { CipherSection } from "./CipherSection.js";
import { MotionSection } from "./MotionSection.js";
import { PaperSection } from "./PaperSection.js";
import { TokensSection } from "./TokensSection.js";

/**
 * La page du labo de la refonte : chaque proposition montrée en vrai, et une barre de
 * réglages qui fait ce que fera un jour la surcharge du back-office — poser des propriétés
 * `--occ-*` et un `data-motion` sur la racine du document, à chaud. Rien n'est enregistré
 * hors de ce navigateur.
 */

type Override = Record<string, string>;

const STORAGE_KEY = "occulis.lab";

interface Knobs {
  theme: ThemeName;
  motion: MotionLevel;
  overrides: Override;
}

function loadKnobs(): Knobs {
  const fallback: Knobs = { theme: "obsidian", motion: "full", overrides: {} };
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

function Knob({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="occ-lab-knob">
      <span className="occ-label">{label}</span>
      {children}
    </label>
  );
}

function Range({
  label,
  name,
  min,
  max,
  step,
  fallback,
  unit = "",
  overrides,
  onChange,
}: {
  label: string;
  name: string;
  min: number;
  max: number;
  step: number;
  fallback: number;
  unit?: string;
  overrides: Override;
  onChange: (name: string, value: string) => void;
}) {
  const value = Number.parseFloat(overrides[name] ?? String(fallback));
  return (
    <Knob label={`${label} · ${value}${unit}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(name, `${event.target.value}${unit}`)}
      />
    </Knob>
  );
}

export function Lab() {
  const [knobs, setKnobs] = useState<Knobs>(loadKnobs);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = knobs.theme;
    if (knobs.motion === "full") delete root.dataset.motion;
    else root.dataset.motion = knobs.motion;
    for (const name of [...root.style].filter((property) => property.startsWith("--occ-")))
      root.style.removeProperty(name);
    for (const [name, value] of Object.entries(knobs.overrides))
      root.style.setProperty(name, value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(knobs));
    } catch {
      // Stockage indisponible : les réglages valent pour la session.
    }
  }, [knobs]);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const override = (name: string, value: string): void =>
    setKnobs((current) => ({ ...current, overrides: { ...current.overrides, [name]: value } }));
  // Changer d'intensité ou de tempo remonte les démonstrations : chacune relit les réglages
  // à son départ, comme le ferait une page à son ouverture.
  const revision = `${knobs.motion}:${knobs.overrides["--occ-tempo"] ?? "1"}`;

  return (
    <UiRoot fullPage>
      <div className="occ-lab-knobs">
        <Wordmark section="redesign lab" />
        <a className="occ-label" href="/admin/#/design">
          Design system →
        </a>
        <Knob label="Theme">
          <Segmented<ThemeName>
            options={THEME_NAMES.map((name) => ({ value: name, label: name }))}
            value={knobs.theme}
            onChange={(theme) => setKnobs((current) => ({ ...current, theme }))}
          />
        </Knob>
        <Knob label={reduced ? "Motion · OS asks for reduced motion: still wins" : "Motion"}>
          <Segmented<MotionLevel>
            options={MOTION_LEVEL_NAMES.map((name) => ({ value: name, label: name }))}
            value={knobs.motion}
            onChange={(motion) => setKnobs((current) => ({ ...current, motion }))}
          />
        </Knob>
        <Range
          label="Tempo"
          name="--occ-tempo"
          min={0.25}
          max={3}
          step={0.25}
          fallback={1}
          overrides={knobs.overrides}
          onChange={override}
        />
        <Range
          label="Paper speed"
          name="--occ-paper-speed"
          min={150}
          max={3000}
          step={50}
          fallback={PROPOSED.paper.speed}
          unit=""
          overrides={knobs.overrides}
          onChange={override}
        />
        <Range
          label="Paper grid"
          name="--occ-paper-grid"
          min={4}
          max={24}
          step={2}
          fallback={PROPOSED.paper.grid}
          unit="px"
          overrides={knobs.overrides}
          onChange={override}
        />
        <Range
          label="Paper dot"
          name="--occ-paper-dot-size"
          min={1}
          max={4}
          step={1}
          fallback={PROPOSED.paper.dot}
          unit="px"
          overrides={knobs.overrides}
          onChange={override}
        />
        <Knob label="Paper resorb">
          <Segmented
            options={["dither", "recede", "none"].map((value) => ({ value, label: value }))}
            value={knobs.overrides["--occ-paper-resorb"] ?? PROPOSED.paper.resorb}
            onChange={(value) => override("--occ-paper-resorb", value)}
          />
        </Knob>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setKnobs({ theme: "obsidian", motion: "full", overrides: {} })}
        >
          Reset
        </Button>
      </div>
      <main className="occ-page occ-lab">
        <TokensSection />
        <CipherSection key={`cipher-${revision}`} />
        <PaperSection
          key={`paper-${revision}`}
          resorb={knobs.overrides["--occ-paper-resorb"] ?? PROPOSED.paper.resorb}
          onResorb={(value) => override("--occ-paper-resorb", value)}
        />
        <MotionSection key={`motion-${revision}`} />
      </main>
    </UiRoot>
  );
}
