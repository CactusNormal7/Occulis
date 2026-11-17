import { ref, watchEffect, type Ref } from "vue";

export interface ClockOptions {
  /** L'horloge tourne ; à l'arrêt, le temps vaut `null`. */
  running: boolean;
  /** Le pas de mise à jour : le temps rendu ne change qu'une fois par pas. */
  stepMs: number;
  /** Arrivée à ce temps, l'horloge s'arrête : rien ne tourne pour un texte posé. */
  untilMs?: number | undefined;
  /** Change à chaque relance : l'horloge repart de zéro. */
  runKey?: string | undefined;
}

/**
 * Le temps écoulé depuis le départ, mis à jour au pas `stepMs` tant que `running`. Chaque
 * changement des options relance l'horloge **et** remet le temps à `null` avant le rendu
 * suivant : une animation rejouée ne se croit jamais déjà finie.
 */
export function useClock(options: () => ClockOptions): Ref<number | null> {
  const elapsed = ref<number | null>(null);

  watchEffect((onCleanup) => {
    const { running, stepMs, untilMs = Number.POSITIVE_INFINITY } = options();
    elapsed.value = null;
    if (!running) return;

    const start = performance.now();
    let frame = 0;
    let lastStep = -1;
    const loop = (now: number): void => {
      const step = Math.floor((now - start) / stepMs);
      // Une image par pas, pas une par trame : le glyphe ne change qu'au pas.
      if (step !== lastStep || now - start >= untilMs) {
        lastStep = step;
        elapsed.value = now - start;
      }
      if (now - start < untilMs) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    onCleanup(() => cancelAnimationFrame(frame));
  });

  return elapsed;
}
