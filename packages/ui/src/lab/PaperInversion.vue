<script setup lang="ts">
/**
 * L'inversion « papier millimétré », en calque par-dessus son conteneur (qui doit être
 * positionné). Le calque est décoratif (`aria-hidden`) et ne capte aucun clic : ce qui est
 * dessous reste lisible et actionnable par tout autre moyen.
 *
 * Tous ses réglages viennent des tokens, lus au départ : vitesse (`--occ-paper-speed`), pas
 * du quadrillage et taille des points, durées de tenue et de résorption (`--occ-dur-hold`,
 * `--occ-dur-resorb`, tempo compris), mode de résorption. Sous `still`, rien ne se propage :
 * l'inversion entière paraît et s'en va en fondu.
 *
 * Événements : `covered` quand l'inversion couvre toute sa zone (l'instant de basculer un
 * écran dessous), `done` quand elle est partie.
 */
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { PROPOSED, type PaperResorb } from "../tokens.js";
import { durationMs, readColor, readMotion, readNumber, readText } from "./motion.js";
import { createPaperRenderer, type PaperRenderer } from "./paper-gl.js";
import {
  farthestCorner,
  paperAt,
  totalMs,
  zoneDistances,
  zoneReach,
  zoneTexels,
  type PaperTiming,
} from "./paper.js";
import type { PaperRun } from "./types.js";

const props = withDefaults(
  defineProps<{
    run: PaperRun | null;
    /**
     * `cover` pose un papier opaque par-dessus ce qui est dessous ; `invert` inverse ce qui est
     * dessous (`mix-blend-mode: difference`) — le texte d'os y devient noir, mais les lueurs y
     * prennent leur complémentaire.
     */
    blend?: "cover" | "invert" | undefined;
    /** Remplace `--occ-paper-resorb` pour cette inversion. */
    resorb?: PaperResorb | undefined;
  }>(),
  { blend: "cover" },
);

const emit = defineEmits<{ covered: []; done: [] }>();

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
let renderer: PaperRenderer | null = null;
let resizeObserver: ResizeObserver | null = null;
/** La dernière image posée : redimensionner le canevas l'efface, on la redessine aussitôt. */
let redraw: (() => void) | null = null;

function isResorb(value: string): value is PaperResorb {
  return value === "dither" || value === "recede" || value === "none";
}

onMounted(() => {
  const element = canvas.value;
  if (element === null) return;
  renderer = createPaperRenderer(element);
  const fit = (): void => {
    const box = element.getBoundingClientRect();
    renderer?.resize(box.width, box.height, window.devicePixelRatio || 1);
    redraw?.();
  };
  fit();
  resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(element);

  // Le départ ne dépend que de la clé : changer de fusion ou de disparition vaut pour
  // l'inversion suivante, sans rejouer la dernière.
  watch(
    () => props.run?.key,
    (_key, _previous, onCleanup) => onCleanup(startRun()),
    {
      immediate: true,
    },
  );
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  renderer?.dispose();
  renderer = null;
});

/** Lance l'inversion décrite par `run` et rend de quoi l'interrompre. */
function startRun(): () => void {
  const element = canvas.value;
  const gl = renderer;
  const { run, blend, resorb } = props;
  if (run === null || element === null) return () => undefined;

  const motion = readMotion();
  const speedPx = readNumber("--occ-paper-speed", PROPOSED.paper.speed);
  const grid = readNumber("--occ-paper-grid", PROPOSED.paper.grid);
  const dot = readNumber("--occ-paper-dot-size", PROPOSED.paper.dot);
  const tokenResorb = readText("--occ-paper-resorb", PROPOSED.paper.resorb);
  const mode: PaperResorb = resorb ?? (isResorb(tokenResorb) ? tokenResorb : "dither");
  const paper = readColor("--occ-paper", element);
  const dotColor = readColor("--occ-paper-dot", element);
  // Sans couleur lisible, pas d'effet : il est décoratif, et aucune couleur ne s'écrit ici.
  if (paper === undefined || dotColor === undefined) return () => undefined;
  const box = element.getBoundingClientRect();

  const { source } = run;
  let reach: number;
  let speed: number;
  if (source.kind === "point") {
    reach = farthestCorner(box.width, box.height, source);
    speed = speedPx;
  } else {
    const distances = zoneDistances(source.zone, source.origin);
    gl?.setZone(zoneTexels(distances, source.columns, source.rows), source.columns, source.rows);
    reach = zoneReach(distances);
    // La vitesse reste celle du papier à l'écran : convertie en cases par seconde par le pas
    // entre deux centres de cases voisines.
    speed = speedPx / Math.hypot(source.iso.tileWidth / 2, source.iso.tileHeight / 2);
  }
  const timing: PaperTiming = {
    reach,
    speed: speed / motion.tempo,
    holdMs: durationMs("hold", motion),
    resorbMs: durationMs("resorb", motion),
    resorb: mode,
  };

  const draw = (front: number, dissolve: number): void => {
    redraw = () => draw(front, dissolve);
    gl?.draw({
      mode: source.kind === "point" ? "circle" : "zone",
      origin: source.kind === "point" ? source : { x: 0, y: 0 },
      front,
      dissolve,
      grid,
      dot,
      paper,
      dotColor,
      invert: blend === "invert",
      iso: source.kind === "zone" ? source.iso : undefined,
      zoneSize: source.kind === "zone" ? [source.columns, source.rows] : undefined,
    });
  };
  const clear = (): void => {
    redraw = null;
    gl?.clear();
  };

  if (motion.level === "still") return fadeWhole(element, reach, timing, mode, draw, clear);

  delete element.dataset.still;
  const total = totalMs(timing);
  const start = performance.now();
  let covered = false;
  let frame = 0;
  const loop = (now: number): void => {
    const state = paperAt(now - start, timing);
    if (state.covered && !covered) {
      covered = true;
      emit("covered");
    }
    if (state.phase === "done") {
      clear();
      emit("done");
      return;
    }
    draw(state.front, state.dissolve);
    // Une inversion qui ne se résorbe pas reste posée : la dernière image suffit, la boucle
    // s'arrête au lieu de redessiner la même chose à chaque trame.
    if (Number.isFinite(total) || !covered) frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(frame);
    clear();
  };
}

/** Sans mouvement : l'inversion entière, en fondu d'opacité, puis le fondu inverse. */
function fadeWhole(
  element: HTMLCanvasElement,
  reach: number,
  timing: PaperTiming,
  mode: PaperResorb,
  draw: (front: number, dissolve: number) => void,
  clear: () => void,
): () => void {
  const fade = durationMs("base", readMotion());
  draw(reach, 0);
  element.dataset.still = "out";
  // Une lecture forcée, une seule fois : le navigateur doit avoir peint l'état transparent
  // pour que le fondu ait un point de départ.
  void element.offsetWidth;
  element.dataset.still = "in";

  const timers = [window.setTimeout(() => emit("covered"), fade)];
  if (mode !== "none") {
    timers.push(
      window.setTimeout(() => (element.dataset.still = "out"), fade + timing.holdMs),
      window.setTimeout(
        () => {
          delete element.dataset.still;
          clear();
          emit("done");
        },
        fade * 2 + timing.holdMs,
      ),
    );
  }
  return () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    delete element.dataset.still;
    clear();
  };
}
</script>

<template>
  <canvas
    ref="canvas"
    :class="['occ-paper', { 'occ-paper--invert': blend === 'invert' }]"
    aria-hidden="true"
  />
</template>
