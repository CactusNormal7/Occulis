import { useCallback, useEffect, useState } from "react";
import type { Outcome } from "./api.js";
import { parseRoute, type Route } from "./model.js";

/** La route lue dans le fragment de l'URL, tenue à jour à chaque navigation. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

export type Loaded<T> =
  | { readonly state: "loading" }
  | { readonly state: "failed"; readonly message: string }
  | { readonly state: "ready"; readonly value: T };

/**
 * Charge une ressource et la recharge à la demande. Une réponse arrivée après un
 * changement de `key` est jetée : une navigation rapide ne doit jamais afficher la vue
 * d'avant. `reload` relit depuis le serveur après une écriture — l'écran montre ce que la
 * base contient, jamais ce qu'on vient d'envoyer.
 */
export function useLoad<T>(key: string, load: () => Promise<Outcome<T>>): { loaded: Loaded<T>; reload: () => void } {
  const [loaded, setLoaded] = useState<Loaded<T>>({ state: "loading" });
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let current = true;
    void load().then((outcome) => {
      if (!current) return;
      setLoaded(outcome.ok ? { state: "ready", value: outcome.value } : { state: "failed", message: outcome.message });
    });
    return () => {
      current = false;
    };
    // `load` change d'identité à chaque rendu : c'est `key` qui dit quand la ressource
    // change vraiment, et `generation` quand il faut la relire.
  }, [key, generation]);

  useEffect(() => setLoaded({ state: "loading" }), [key]);

  const reload = useCallback(() => setGeneration((value) => value + 1), []);
  return { loaded, reload };
}
