import { type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore, startTransition } from "react";
import { EmptyState } from "@occulis/ui";
import { type Loaded, type Resource, loadCache, loadedOf, pendingLoads } from "./cache.js";

/**
 * Lit une ressource — **la** façon de lire une donnée dans une vue React du client
 * (docs/technical/engine.md, « Chargement et premier rendu »).
 *
 * Tant que la ressource n'est jamais arrivée, la vue **suspend** : c'est la frontière
 * `Suspense` de la page qui attend, pour toutes les vues de l'écran à la fois, et l'écran
 * paraît d'un seul tenant. Une navigation passée par `startTransition` (`useHashRoute`)
 * garde l'écran précédent affiché pendant ce temps. Arrivée, la ressource se relit en
 * arrière-plan si elle n'est plus fraîche ; `reload` la relit après une écriture, en
 * gardant l'écran — l'écran montre ce que la base contient, jamais ce qu'on vient
 * d'envoyer.
 */
export function useLoad<T>(resource: Resource<T>): { loaded: Loaded<T>; reload: () => void } {
  const { key } = resource;
  const latest = useRef(resource);
  latest.current = resource;

  const entry = useSyncExternalStore(
    (listener) => loadCache.subscribe(key, listener),
    () => loadCache.peek<T>(key),
  );

  useEffect(() => {
    void loadCache.request(latest.current);
  }, [key]);

  const reload = useCallback(() => void loadCache.request(latest.current, { force: true }), [key]);

  // Une promesse qui ne rejette jamais : React rend de nouveau la vue à son arrivée.
  if (entry?.outcome === undefined) throw loadCache.request(resource);
  return { loaded: loadedOf({ ...entry, outcome: entry.outcome }), reload };
}

/** Vrai tant qu'au moins une lecture de la page est en cours : la barre de progression le suit. */
export function usePending(): boolean {
  return useSyncExternalStore(
    (listener) => pendingLoads.subscribe(listener),
    () => pendingLoads.value > 0,
  );
}

/** Le rendu d'une ressource arrivée, ou son refus. */
export function whenReady<T>(loaded: Loaded<T>, render: (value: T) => ReactNode): ReactNode {
  if (loaded.state === "failed") return <EmptyState error>{loaded.message}</EmptyState>;
  return render(loaded.value);
}

/**
 * La route lue dans le fragment de l'URL. Un changement précharge ce que la route lira
 * (`resourcesOf`), puis passe en transition : l'écran affiché reste en place jusqu'à ce
 * que le suivant soit complet, au lieu de se vider puis de se remplir par morceaux.
 */
export function useHashRoute<R>(parse: (hash: string) => R, resourcesOf: (route: R) => readonly Resource<unknown>[]): R {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const update = () => {
      const next = parse(location.hash);
      loadCache.preload(resourcesOf(next));
      startTransition(() => setRoute(next));
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
