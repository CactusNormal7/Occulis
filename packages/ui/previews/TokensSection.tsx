import { useState } from "react";
import { Button, CodeBlock, Specimen, Stage } from "../src/index.js";
import { MOTION_LEVEL_NAMES, PROPOSED } from "../src/tokens.js";

function Track({ duration, easing, run }: { duration: string; easing: string; run: boolean }) {
  return (
    <div className="occ-lab-track" data-run={run}>
      <span style={{ transitionDuration: duration, transitionTimingFunction: easing }} />
    </div>
  );
}

const OVERRIDE_EXAMPLE = `// Globally, or for one account: only knobs and roles, on the root.
const root = document.documentElement;
root.dataset.motion = "calm";                  // full | calm | still
root.style.setProperty("--occ-tempo", "1.5");  // every --occ-dur-* follows
root.style.setProperty("--occ-paper-speed", "600");

// A JavaScript animation never reads a literal duration:
const motion = readMotion();                   // @occulis/ui/lab
const ms = durationMs("decode", motion);       // 900 × tempo`;

/** Chantier 1 : les tokens proposés, montrés par leur effet. */
export function TokensSection() {
  const [run, setRun] = useState(false);
  const durations = Object.entries(PROPOSED.duration).filter(([name]) => name !== "breath");
  return (
    <section className="occ-lab-section" id="tokens">
      <header>
        <h2 className="occ-label">1 · Tokens and motion</h2>
        <p>
          Three layers: values (tokens.ts), roles (--occ-dur-window, --occ-paper…) that stylesheets read, and three knobs
          (--occ-tempo, --occ-motion-amplitude, --occ-motion-loop) that a runtime override sets on the root. Use the bar above
          to try them: every demo on this page reads them when it starts.
        </p>
      </header>
      <Stage
        title="Durations · ease-out"
        actions={
          <Button size="sm" icon="play" onClick={() => setRun((value) => !value)}>
            {run ? "Back" : "Play"}
          </Button>
        }
      >
        <div className="occ-lab-grid">
          {durations.map(([name, ms]) => (
            <Specimen key={name} name={`--occ-dur-${name}`} value={`${ms}ms`}>
              <Track duration={`var(--occ-dur-${name})`} easing="var(--occ-ease-out)" run={run} />
            </Specimen>
          ))}
        </div>
      </Stage>
      <Stage title="Easings · over --occ-dur-slow">
        <div className="occ-lab-grid">
          {Object.entries({ out: "out", in: "in", "in-out": "inOut", sweep: "sweep" } as const).map(([css, key]) => (
            <Specimen key={css} name={`--occ-ease-${css}`} value={PROPOSED.easing[key]}>
              <Track duration="var(--occ-dur-slow)" easing={`var(--occ-ease-${css})`} run={run} />
            </Specimen>
          ))}
        </div>
      </Stage>
      <Stage title="Intensity levels">
        <div className="occ-lab-grid">
          {MOTION_LEVEL_NAMES.map((level) => {
            const { amplitude, loop, scramble } = PROPOSED.motion[level];
            return (
              <Specimen key={level} name={`data-motion="${level}"`} value={`amplitude ${amplitude} · loops ${loop} · scramble ${scramble ? "yes" : "no"}`}>
                <span className="occ-lab-note">
                  {level === "full" && "Everything: arcs, trails, scrambling glyphs, looping ornaments."}
                  {level === "calm" && "Shorter distances, no trail, no loop; glyphs yield their letter without scrambling."}
                  {level === "still" && "Nothing travels; changes cross-fade. Forced by prefers-reduced-motion."}
                </span>
              </Specimen>
            );
          })}
        </div>
      </Stage>
      <Stage title="Distances · × amplitude">
        <div className="occ-lab-grid">
          {Object.entries(PROPOSED.distance).map(([name, px]) => (
            <Specimen key={name} name={`--occ-dist-${name}`} value={`${px}px`}>
              <span className="occ-lab-note">{name}</span>
            </Specimen>
          ))}
        </div>
      </Stage>
      <CodeBlock label="Runtime override — what the back-office will do">{OVERRIDE_EXAMPLE}</CodeBlock>
    </section>
  );
}
