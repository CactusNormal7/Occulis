import { useToast } from "@occulis/ui";
import type * as api from "../api.js";
import { routeHash, type Route } from "../model.js";

/** Ce qu'une action rapide doit savoir d'un compte. */
export interface QuickUser {
  readonly id: string;
  readonly name: string;
  readonly role?: string | null | undefined;
  readonly emailVerified: boolean;
  readonly banned?: boolean | null | undefined;
}

/** Joue un geste et annonce son résultat ; rend vrai s'il a réussi. */
export type Act = (pending: Promise<api.Outcome<unknown>>, done: string) => Promise<boolean>;

/** Joue un geste, annonce son résultat, et relit la vue s'il a réussi. */
export function useAct(reload: () => void): Act {
  const notify = useToast();
  return async (pending, done) => {
    const outcome = await pending;
    notify(outcome.ok ? done : outcome.message, outcome.ok);
    if (outcome.ok) reload();
    return outcome.ok;
  };
}

/** Change de route en annonçant un résultat, qui survit à la navigation. */
export function useGo(): (route: Route, message: string) => void {
  const notify = useToast();
  return (route, message) => {
    notify(message, true);
    location.hash = routeHash(route);
  };
}
