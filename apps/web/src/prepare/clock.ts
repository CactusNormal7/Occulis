import { useEffect, useState } from "react";
import { remainingAt } from "./model.js";

/**
 * Le temps restant, réévalué quatre fois par seconde tant qu'il en reste. Le seul
 * minuteur des écrans d'avant-partie : l'échéance elle-même est tenue par le serveur.
 */
export function useRemaining(remainingMs: number, receivedAt: number): number {
  const [now, setNow] = useState(() => performance.now());
  const remaining = remainingAt(remainingMs, receivedAt, now);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(timer);
  }, [remaining <= 0]);
  return remaining;
}
