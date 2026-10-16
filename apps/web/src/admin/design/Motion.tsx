import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Badge,
  Button,
  Card,
  CardGrid,
  CodeBlock,
  CountdownRing,
  Dialog,
  Note,
  Specimen,
  Stage,
  Table,
  revealWindow,
  useMessages,
  useToast,
} from "@occulis/ui";
import { easeInOutSine, easeOutBack, easeOutCubic } from "../../view/easing.js";
import veilCss from "../../ui/veil.css?raw";
import "../../ui/veil.css";
import type { CssAnimation } from "./catalog.js";
import { useTweaks } from "./context.js";
import { BOARD_MOTION, CHARTER_ANIMATIONS, COMPONENTS, GAME_ANIMATIONS } from "./sources.js";

/**
 * Les animations, rejouables et ralenties (`speed`, dans les retouches) : l'ouverture des
 * fenêtres, le voile tramé, l'entrée d'un bloc, les composants animés, puis ce qui ne se
 * rejoue pas hors de son écran — le plateau et la page du jeu — par leurs durées et leurs
 * courbes, lues dans leurs sources.
 */
export function Motion() {
  return (
    <>
      <WindowOpening />
      <Veil />
      <CardGrid>
        <BlockEntrance />
        <Countdown />
      </CardGrid>
      <OpponentReveal />
      <Board />
      <Declared kind="game" animations={GAME_ANIMATIONS} />
      <Declared kind="charter" animations={CHARTER_ANIMATIONS} />
    </>
  );
}

function WindowOpening() {
  const m = useMessages().admin.design.motion.windows;
  const { speed } = useTweaks();
  const notify = useToast();
  const panel = useRef<HTMLDivElement>(null);
  const origin = useRef<"center" | "pointer">("center");
  const [shown, setShown] = useState(false);
  const [dialog, setDialog] = useState(false);

  const open = (from: "center" | "pointer") => {
    origin.current = from;
    flushSync(() => setShown(true));
    if (panel.current !== null) void revealWindow(panel.current, "open", from, { speed });
  };
  const close = () => {
    if (panel.current === null) return;
    void revealWindow(panel.current, "close", origin.current, { speed }).then(() => setShown(false));
  };

  return (
    <Card title={m.title}>
      <Note>{m.text}</Note>
      <Stage
        actions={
          <>
            <Button size="sm" onClick={() => open("center")}>
              {m.fromCenter}
            </Button>
            <Button size="sm" onClick={() => open("pointer")}>
              {m.fromPointer}
            </Button>
            <Button size="sm" variant="ghost" disabled={!shown} onClick={close}>
              {m.close}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => notify(m.toastText)}>
              {m.toast}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDialog(true)}>
              {m.dialog}
            </Button>
          </>
        }
      >
        <div ref={panel} hidden={!shown} style={{ maxWidth: 360 }}>
          <Card title={m.sampleTitle}>
            <Note>{m.sampleText}</Note>
          </Card>
        </div>
      </Stage>
      <Dialog open={dialog} title={m.dialogTitle} confirmLabel={m.close} onConfirm={() => true} onClose={() => setDialog(false)}>
        <Note>{m.dialogText}</Note>
      </Dialog>
    </Card>
  );
}

/**
 * Le voile du changement de thème, rejoué tel quel : la même classe, la même feuille
 * (`ui/veil.css`), posée sur la page et retirée à la fin de son animation — ralentie avec
 * les autres par les retouches.
 */
function Veil() {
  const m = useMessages().admin.design.motion.veil;
  const replay = () => {
    const veil = document.createElement("div");
    veil.className = "theme-veil";
    veil.addEventListener("animationend", () => veil.remove());
    document.body.append(veil);
  };
  return (
    <Card title={m.title} action={<Badge tone="strong">{m.locked}</Badge>}>
      <Note>{m.text}</Note>
      <Stage
        actions={
          <Button size="sm" icon="play" onClick={replay}>
            {m.replay}
          </Button>
        }
      >
        <CodeBlock label="apps/web/src/ui/veil.css">{veilCss.trim()}</CodeBlock>
      </Stage>
    </Card>
  );
}

function BlockEntrance() {
  const m = useMessages().admin.design.motion.enter;
  const [round, setRound] = useState(0);
  return (
    <Card
      title={m.title}
      action={
        <Button size="sm" icon="play" onClick={() => setRound((value) => value + 1)}>
          {m.replay}
        </Button>
      }
    >
      <Note>{m.text}</Note>
      <Stage>
        <div key={round} className="occ-enter">
          <Card>
            <Note>{m.sample}</Note>
          </Card>
        </div>
      </Stage>
    </Card>
  );
}

const COUNTDOWN_MS = 15_000;

function Countdown() {
  const m = useMessages().admin.design.motion.animated;
  const [remaining, setRemaining] = useState(COUNTDOWN_MS);
  const { speed } = useTweaks();
  useEffect(() => {
    const tick = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1000)), 1000 / speed);
    return () => window.clearInterval(tick);
  }, [speed]);
  return (
    <Card
      title={m.countdown}
      action={
        <Button size="sm" icon="play" onClick={() => setRemaining(COUNTDOWN_MS)}>
          {m.restart}
        </Button>
      }
    >
      <Stage>
        <CountdownRing totalMs={COUNTDOWN_MS} remainingMs={remaining} label={m.countdown}>
          {Math.ceil(remaining / 1000)}
        </CountdownRing>
      </Stage>
    </Card>
  );
}

/** L'annonce de l'adversaire, montée depuis son propre aperçu et rejouée en la remontant. */
function OpponentReveal() {
  const m = useMessages().admin.design.motion.animated;
  const [round, setRound] = useState(0);
  const Announcement = COMPONENTS.find((entry) => entry.name === "Reveal")?.stories[0]?.Render;
  if (Announcement === undefined) return null;
  return (
    <Card
      title={m.reveal}
      action={
        <Button size="sm" icon="play" onClick={() => setRound((value) => value + 1)}>
          {m.restart}
        </Button>
      }
    >
      <Stage>
        <Announcement key={round} />
      </Stage>
    </Card>
  );
}

const CURVES = [
  ["easeOutCubic", easeOutCubic],
  ["easeInOutSine", easeInOutSine],
  ["easeOutBack", (t: number) => easeOutBack(t)],
] as const;

const CURVE_MS = 900;

/** Les durées du plateau, et ses courbes tracées avec un point qui les parcourt. */
function Board() {
  const m = useMessages().admin.design.motion;
  const { speed } = useTweaks();
  const [progress, setProgress] = useState(1);
  const play = () => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, ((now - start) * speed) / CURVE_MS);
      setProgress(t);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  return (
    <Card title={m.board.title}>
      <Note>{m.board.text}</Note>
      <Stage
        title={m.board.curves}
        actions={
          <Button size="sm" icon="play" onClick={play}>
            {m.board.replay}
          </Button>
        }
      >
        {CURVES.map(([name, curve]) => (
          <Specimen key={name} name={name} value="apps/web/src/view/easing.ts">
            <Curve curve={curve} progress={progress} />
          </Specimen>
        ))}
      </Stage>
      <Table columns={[m.columns.key, m.columns.value, m.columns.note]} rowCount={BOARD_MOTION.length}>
        {BOARD_MOTION.map((field) => (
          <tr key={field.key}>
            <td>
              <code>{field.key}</code>
            </td>
            <td>
              <code>{field.value}</code>
            </td>
            <td>{field.note}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

const PLOT = { width: 220, height: 72, low: -0.15, high: 1.2 } as const;

function Curve({ curve, progress }: { curve: (t: number) => number; progress: number }) {
  const y = (value: number) => PLOT.height - ((value - PLOT.low) / (PLOT.high - PLOT.low)) * PLOT.height;
  const points = Array.from({ length: 49 }, (_, i) => i / 48)
    .map((t) => `${(t * PLOT.width).toFixed(1)},${y(curve(t)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={PLOT.width} height={PLOT.height} viewBox={`0 0 ${PLOT.width} ${PLOT.height}`} aria-hidden="true">
      <line x1={0} x2={PLOT.width} y1={y(1)} y2={y(1)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="2 3" />
      <polyline points={points} fill="none" stroke="currentColor" strokeOpacity={0.6} />
      <rect x={progress * PLOT.width - 3} y={y(curve(progress)) - 3} width={6} height={6} fill="currentColor" />
    </svg>
  );
}

function Declared({ kind, animations }: { kind: "game" | "charter"; animations: readonly CssAnimation[] }) {
  const m = useMessages().admin.design.motion;
  return (
    <Card title={m[kind].title}>
      <Note>{m[kind].text}</Note>
      <Table columns={[m.columns.selector, m.columns.animation, m.columns.note]} rowCount={animations.length}>
        {animations.map((animation, index) => (
          <tr key={`${animation.selector}-${index}`}>
            <td>
              <code>{animation.selector}</code>
            </td>
            <td>
              <code>{animation.animation}</code>
            </td>
            <td>{animation.note}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}
