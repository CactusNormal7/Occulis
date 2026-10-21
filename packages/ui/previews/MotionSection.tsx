import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Badge, Button, CountdownRing, PlayerPlate, Stage } from "../src/index.js";
import { CipherFrieze, CipherText, PaperInversion, type PaperRun } from "../src/lab/index.js";
import { BoardPrototype, PieceIcon } from "./BoardPrototype.js";
import type { Role } from "./board-mock.js";

const ROLES: readonly { role: Role; label: string }[] = [
  { role: "master", label: "Master — eye on a mast" },
  { role: "ability", label: "Ability — lozenge and spike" },
  { role: "pawn", label: "Pawn — short leaning mast" },
];

/** Prototype 1 : un coup sur le plateau. */
function BoardMove() {
  const [round, setRound] = useState(0);
  return (
    <Stage
      title="Prototype 1 · A move on the board — select, hop, line of sight"
      actions={
        <Button size="sm" variant="ghost" onClick={() => setRound((value) => value + 1)}>
          Reset
        </Button>
      }
    >
      <p className="occ-lab-note">
        Click a teal piece: it lifts, its destinations open in a cascade. Click a destination: an
        arc with afterimages, a ripple on landing, then the line of sight unfolds as a wave from the
        landing tile. An enemy entering sight materialises; one leaving it leaves a dotted ghost.
        Calm: lower arc, no trail. Still: the piece fades across, fog cross-fades at once.
      </p>
      <BoardPrototype key={round} label="Prototype board: camp A to move" />
      <div className="occ-lab-legend">
        {ROLES.map(({ role, label }) => (
          <figure key={role}>
            <div className="occ-lab-row">
              <PieceIcon role={role} camp="A" />
              <PieceIcon role={role} camp="B" />
            </div>
            <figcaption className="occ-label">{label}</figcaption>
          </figure>
        ))}
      </div>
    </Stage>
  );
}

/** Prototype 2 : le passage d'un écran à l'autre sous le papier. */
function ScreenThreshold() {
  const [screen, setScreen] = useState<"found" | "deploy">("found");
  const [run, setRun] = useState<PaperRun | null>(null);
  const [decode, setDecode] = useState(0);
  const frame = useRef<HTMLDivElement>(null);

  const accept = (event: MouseEvent<HTMLButtonElement>): void => {
    const box = frame.current?.getBoundingClientRect();
    if (box === undefined) return;
    const button = event.currentTarget.getBoundingClientRect();
    // Le papier part du bouton : le geste dit d'où vient le changement d'écran.
    setRun({
      key: Date.now(),
      source: {
        kind: "point",
        x: button.left + button.width / 2 - box.left,
        y: button.top + button.height / 2 - box.top,
      },
    });
  };

  return (
    <Stage
      title="Prototype 2 · Screen threshold — match found → deployment"
      actions={
        <Button size="sm" variant="ghost" onClick={() => setScreen("found")}>
          Reset
        </Button>
      }
    >
      <p className="occ-lab-note">
        The paper spreads from the button that was pressed, covers the frame, the screen swaps
        underneath in one piece, then the paper resorbs in an ordered dither — the same vocabulary
        as the theme veil, without touching it. The new title arrives as glyphs and decodes. Still:
        one cross-fade.
      </p>
      <div className="occ-lab-screen" ref={frame}>
        {screen === "found" ? (
          <div className="occ-lab-screen__content">
            <span className="occ-label">Match found</span>
            <div className="occ-lab-row">
              <PlayerPlate name="Cactus" camp="A" tag="You" lines={["1232 Elo"]} />
              <span className="occ-label">vs</span>
              <PlayerPlate name="boris" camp="B" align="end" lines={["1188 Elo"]} />
            </div>
            <Button variant="primary" onClick={accept}>
              Accept
            </Button>
          </div>
        ) : (
          <div className="occ-lab-screen__content">
            <span className="occ-lab-display">
              <CipherText text="Deployment" mode="decode" playKey={decode} />
            </span>
            <CountdownRing totalMs={90000} remainingMs={90000} size="lg" label="Time left">
              90
            </CountdownRing>
            <Badge tone="dim">1 master · 3 abilities · 4 pawns</Badge>
          </div>
        )}
        <PaperInversion
          run={run}
          onCovered={() => {
            setScreen("deploy");
            setDecode((value) => value + 1);
          }}
        />
      </div>
    </Stage>
  );
}

/** Prototype 3 : l'attente d'un adversaire. */
function QueueWait() {
  const [state, setState] = useState<"idle" | "searching" | "found">("idle");
  const [seconds, setSeconds] = useState(0);
  const [found, setFound] = useState(0);

  useEffect(() => {
    if (state !== "searching") return;
    setSeconds(0);
    // Le temps d'attente est une information : il est compté au fil des secondes, jamais animé.
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  return (
    <Stage
      title="Prototype 3 · Waiting for an opponent"
      actions={
        <>
          <Button size="sm" icon="search" onClick={() => setState("searching")}>
            Search
          </Button>
          <Button
            size="sm"
            disabled={state !== "searching"}
            onClick={() => {
              setState("found");
              setFound((value) => value + 1);
            }}
          >
            Simulate match
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setState("idle")}>
            Reset
          </Button>
        </>
      }
    >
      <p className="occ-lab-note">
        A crown of glyphs turns very slowly around a breathing eye; one glyph shifts now and then.
        The elapsed time stays plain text. When an opponent is found the crown closes into the eye
        and the status decodes. Calm and still: the crown stands still.
      </p>
      <div className="occ-lab-screen">
        <div className="occ-lab-screen__content">
          <div className="occ-lab-queue" data-found={state === "found"}>
            {state !== "idle" && (
              <CipherFrieze
                key={state}
                count={16}
                layout="ring"
                live={state === "searching"}
                seed={9}
              />
            )}
            <span className="occ-lab-eye" aria-hidden="true" />
          </div>
          <span className="occ-label">
            {state === "idle" && "Ready"}
            {state === "searching" && <CipherText text="Searching" mode="plain" />}
            {state === "found" && (
              <CipherText text="Opponent found · boris" mode="decode" playKey={found} />
            )}
          </span>
          {state === "searching" && (
            <span className="occ-lab-note">{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</span>
          )}
        </div>
      </div>
    </Stage>
  );
}

/** Chantier 4 : les trois prototypes d'animation les plus structurants. */
export function MotionSection() {
  return (
    <section className="occ-lab-section" id="motion">
      <header>
        <h2 className="occ-label">4 · Interface motion — three prototypes</h2>
        <p>
          The full inventory (every screen, its intent, its priority) is in
          docs/design/refonte-graphique.md. These three set the vocabulary the others reuse: the
          board move, the screen threshold, the wait.
        </p>
      </header>
      <BoardMove />
      <ScreenThreshold />
      <QueueWait />
    </section>
  );
}
