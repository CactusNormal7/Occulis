import { computed, onScopeDispose, ref, watch, type ComputedRef } from "vue";
import { remainingAt } from "./model.js";

/**
 * Le temps restant, réévalué quatre fois par seconde tant qu'il en reste. Le seul
 * minuteur des écrans d'avant-partie : l'échéance elle-même est tenue par le serveur.
 * `remainingMs` et `receivedAt` sont relus à chaque nouvelle annonce.
 */
export function useRemaining(
  remainingMs: () => number,
  receivedAt: () => number,
): ComputedRef<number> {
  const now = ref(performance.now());
  const remaining = computed(() => remainingAt(remainingMs(), receivedAt(), now.value));

  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => clearInterval(timer);

  // Le minuteur ne dépend que du passage à zéro, pas de chaque quart de seconde écoulé.
  watch(
    () => remaining.value <= 0,
    (expired) => {
      stop();
      if (!expired) timer = setInterval(() => (now.value = performance.now()), 250);
    },
    { immediate: true },
  );
  onScopeDispose(stop);

  return remaining;
}
