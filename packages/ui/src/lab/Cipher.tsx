import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "../cx.js";
import { PROPOSED } from "../tokens.js";
import {
  GLYPH_HEIGHT,
  GLYPH_WIDTH,
  cellAt,
  cipherGlyph,
  flickerVariant,
  isGap,
  scrambleGlyph,
  type CellState,
  type CipherAlphabet,
  type GlyphShape,
} from "./glyphs.js";
import { durationMs, readMotion } from "./motion.js";

export interface GlyphProps {
  glyph: GlyphShape;
  className?: string | undefined;
}

/**
 * Un glyphe au trait d'un pixel. Le trait est la couleur du texte (`currentColor`) : un
 * glyphe ne porte aucune couleur propre. Toujours décoratif — c'est à son parent de dire
 * ce qu'il signifie.
 */
export function Glyph({ glyph, className }: GlyphProps) {
  return (
    <svg
      className={cx("occ-glyph", className)}
      viewBox={`-0.5 -0.5 ${GLYPH_WIDTH + 1} ${GLYPH_HEIGHT + 1}`}
      aria-hidden="true"
      focusable="false"
    >
      {glyph.segments.map(([x1, y1, x2, y2], index) => (
        <line key={`s${index}`} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
      {glyph.rings.map(([x, y], index) => (
        // L'anneau est cranté comme les cadres de la charte : un carré de cinq pas aux
        // coins coupés, la façon dont le pixel art trace un cercle.
        <polygon key={`r${index}`} points={`${x - 1},${y - 2} ${x + 1},${y - 2} ${x + 2},${y - 1} ${x + 2},${y + 1} ${x + 1},${y + 2} ${x - 1},${y + 2} ${x - 2},${y + 1} ${x - 2},${y - 1}`} />
      ))}
      {glyph.dots.map(([x, y], index) => (
        <rect key={`d${index}`} className="occ-glyph__dot" x={x - 0.5} y={y - 0.5} width={1.5} height={1.5} />
      ))}
    </svg>
  );
}

/**
 * Le temps écoulé depuis le départ, mis à jour au pas `stepMs` tant que `running` ; `null` à
 * l'arrêt. Le temps est rattaché à `runKey` : à l'image où l'on relance, l'ancien temps n'est
 * plus rendu — sans quoi une animation rejouée se croirait déjà finie.
 */
function useClock(running: boolean, stepMs: number, runKey: string, untilMs = Number.POSITIVE_INFINITY): number | null {
  const [clock, setClock] = useState<{ key: string; elapsed: number } | null>(null);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let frame = 0;
    let last = -1;
    const loop = (now: number): void => {
      const step = Math.floor((now - start) / stepMs);
      // Une image par pas, pas une par trame : le glyphe ne change qu'au pas.
      if (step !== last || now - start >= untilMs) {
        last = step;
        setClock({ key: runKey, elapsed: now - start });
      }
      // Arrivée au bout, l'horloge s'arrête : rien ne tourne pour un texte posé.
      if (now - start < untilMs) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, stepMs, runKey, untilMs]);
  return running && clock?.key === runKey ? clock.elapsed : null;
}

export type CipherMode = "cipher" | "plain" | "decode" | "encode";

export interface CipherTextProps {
  /** Le texte, toujours lu tel quel par un lecteur d'écran — les glyphes ne sont qu'un habit. */
  text: string;
  /**
   * `cipher` et `plain` sont des états fixes ; `decode` part des glyphes et pose les lettres,
   * `encode` fait l'inverse. Changer `playKey` rejoue l'animation.
   */
  mode?: CipherMode | undefined;
  alphabet?: CipherAlphabet | undefined;
  /** Une lettre a toujours le même glyphe (décodable), ou un glyphe tiré au hasard (ornement). */
  decodable?: boolean | undefined;
  /** La durée de rôle de l'animation : `decode` pour un titre, `slow` ou `base` pour un survol. */
  pace?: "decode" | "slow" | "base" | undefined;
  seed?: number | undefined;
  playKey?: unknown;
  onDone?: (() => void) | undefined;
  className?: string | undefined;
}

/**
 * Une chaîne écrite dans l'alphabet cryptique, qui peut se déchiffrer sous les yeux.
 *
 * Chaque caractère est une case qui superpose sa lettre et son glyphe : la largeur est
 * celle du texte dès la première image, et rien ne bouge autour pendant que les glyphes
 * cèdent. Seule l'opacité change (`data-state`).
 *
 * Sous `calm`, les glyphes ne se brouillent plus : chacun cède sa lettre directement. Sous
 * `still` (et `prefers-reduced-motion`), la chaîne passe d'un état à l'autre en un seul
 * fondu.
 */
export function CipherText({
  text,
  mode = "cipher",
  alphabet = "lattice",
  decodable = true,
  pace = "decode",
  seed = 0,
  playKey,
  onDone,
  className,
}: CipherTextProps) {
  const chars = useMemo(() => Array.from(text), [text]);
  const animated = mode === "decode" || mode === "encode";
  const runKey = `${mode}:${String(playKey)}`;
  const [timing, setTiming] = useState<{ key: string; durationMs: number; tickMs: number; scramble: boolean; still: boolean }>({
    key: "",
    durationMs: 0,
    tickMs: PROPOSED.duration.tick,
    scramble: true,
    still: false,
  });
  const ready = animated && timing.key === runKey;
  const elapsed = useClock(ready && !timing.still, timing.tickMs, runKey, timing.durationMs);
  const doneKey = useRef("");

  useEffect(() => {
    if (!animated) return;
    // Le niveau d'intensité est relu à chaque départ : une surcharge posée à chaud vaut
    // pour l'animation suivante.
    const motion = readMotion();
    setTiming({
      key: runKey,
      durationMs: durationMs(pace, motion),
      tickMs: durationMs("tick", motion),
      scramble: motion.level === "full",
      still: motion.level === "still",
    });
  }, [animated, pace, runKey]);

  const finished = ready && (timing.still || (elapsed !== null && elapsed >= timing.durationMs));
  useEffect(() => {
    if (finished && doneKey.current !== runKey) {
      doneKey.current = runKey;
      onDone?.();
    }
  }, [finished, runKey, onDone]);

  const stateOf = (index: number): CellState => {
    if (mode === "plain") return { state: "plain" };
    if (mode === "cipher") return { state: "cipher" };
    if (finished) return { state: mode === "decode" ? "plain" : "cipher" };
    if (elapsed === null) return { state: mode === "decode" ? "cipher" : "plain" };
    return cellAt(index, chars.length, elapsed, { ...timing, seed }, mode);
  };

  const words: { start: number; chars: string[] }[] = [];
  chars.forEach((char, index) => {
    if (isGap(char)) return;
    const previous = words[words.length - 1];
    if (previous !== undefined && previous.start + previous.chars.length === index) previous.chars.push(char);
    else words.push({ start: index, chars: [char] });
  });

  return (
    <span className={cx("occ-cipher", className)}>
      <span className="occ-cipher__sr">{text}</span>
      <span className="occ-cipher__chars" aria-hidden="true">
        {words.map((word, w) => (
          <span key={word.start} className="occ-cipher__word">
            {w > 0 && " "}
            {word.chars.map((char, offset) => {
              const index = word.start + offset;
              const state = stateOf(index);
              const glyph =
                state.state === "scramble"
                  ? scrambleGlyph(index, state.variant, alphabet, seed)
                  : cipherGlyph(char, index, alphabet, decodable, seed);
              return (
                <span key={index} className="occ-cipher__cell" data-state={state.state}>
                  <span className="occ-cipher__letter">{char}</span>
                  <Glyph glyph={glyph} />
                </span>
              );
            })}
          </span>
        ))}
      </span>
    </span>
  );
}

export interface CipherFriezeProps {
  /** Le nombre de glyphes de la frise. */
  count: number;
  alphabet?: CipherAlphabet | undefined;
  seed?: number | undefined;
  /** Les glyphes frémissent un à un, si le niveau d'intensité laisse tourner les boucles. */
  live?: boolean | undefined;
  /** `row` pour un bandeau ou une bordure, `ring` pour une couronne autour d'un centre. */
  layout?: "row" | "ring" | undefined;
  className?: string | undefined;
}

/**
 * Une frise de glyphes sans texte : un ornement de bordure, de chargement ou de couronne.
 * Entièrement `aria-hidden` — elle ne dit rien et ne doit jamais rien dire.
 */
export function CipherFrieze({ count, alphabet = "lattice", seed = 0, live = false, layout = "row", className }: CipherFriezeProps) {
  const [loop, setLoop] = useState<{ running: boolean; flickerMs: number }>({ running: false, flickerMs: PROPOSED.cipher.flicker });
  useEffect(() => {
    const motion = readMotion();
    setLoop({ running: live && motion.level === "full", flickerMs: PROPOSED.cipher.flicker * motion.tempo });
  }, [live]);
  const elapsed = useClock(loop.running, loop.flickerMs / 2, `frieze:${seed}`) ?? 0;

  return (
    <span className={cx("occ-frieze", `occ-frieze--${layout}`, className)} aria-hidden="true" style={{ ["--frieze-count" as string]: count }}>
      {Array.from({ length: count }, (_, index) => {
        const variant = loop.running ? flickerVariant(index, count, elapsed, loop.flickerMs, seed) : 0;
        return (
          <span key={index} className="occ-frieze__cell" style={{ ["--frieze-index" as string]: index }}>
            <Glyph glyph={scrambleGlyph(index, variant, alphabet, seed)} />
          </span>
        );
      })}
    </span>
  );
}
