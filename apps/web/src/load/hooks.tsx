import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  startTransition,
} from "react";
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

  // `key` sans être lue : un `reload` neuf par ressource, comme l'effet ci-dessus.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

/** Une route affichée et celle que vise la dernière navigation. */
export interface HashRoute<R> {
  /** La route dont l'écran est affiché. */
  readonly route: R;
  /** La route du fragment : celle de la barre du haut, dès le clic. */
  readonly target: R;
  /**
   * Vrai quand la navigation change d'écran et que le suivant n'est pas arrivé : la page
   * montre alors le squelette de `target` à la place de l'écran de `route`.
   */
  readonly switching: boolean;
}

/**
 * La route lue dans le fragment de l'URL. Une navigation est **immédiate** : la barre du
 * haut passe à la route visée dès le clic. Si tout ce que l'écran suivant lit est déjà
 * là, il le remplace aussitôt ; sinon la route passe en transition, et pendant l'attente
 * `switching` dit de montrer son squelette — sauf entre deux états d'un même écran
 * (`screenOf` : une page de table, une recherche), où l'écran affiché reste en place.
 *
 * Tout lien vers un fragment de la page précharge sa route au survol, au focus et à
 * l'appui : le plus souvent, l'écran est arrivé avant le relâchement du clic.
 */
export function useHashRoute<R>(
  parse: (hash: string) => R,
  resourcesOf: (route: R) => readonly Resource<unknown>[],
  screenOf: (route: R) => string,
): HashRoute<R> {
  const [route, setRoute] = useState(() => parse(location.hash));
  const [target, setTarget] = useState(route);
  useEffect(() => {
    const update = () => {
      const next = parse(location.hash);
      const resources = resourcesOf(next);
      loadCache.preload(resources);
      setTarget(next);
      if (resources.every(arrived)) setRoute(next);
      else startTransition(() => setRoute(next));
    };
    window.addEventListener("hashchange", update);
    const stopPrefetch = prefetchLinks((hash) => loadCache.preload(resourcesOf(parse(hash))));
    return () => {
      window.removeEventListener("hashchange", update);
      stopPrefetch();
    };
    // Un seul écouteur pour la vie de la page : `parse` et `resourcesOf` sont des
    // fonctions de module, que chaque rendu repasse sans qu'elles changent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { route, target, switching: screenOf(target) !== screenOf(route) };
}

/** Une ressource déjà lue au moins une fois : son écran peut paraître sans attendre. */
function arrived(resource: Resource<unknown>): boolean {
  return loadCache.peek(resource.key)?.outcome !== undefined;
}

/**
 * Le survol ne précharge qu'après un court arrêt du pointeur : traverser une liste de
 * liens ne lance pas une lecture par ligne. Le focus et l'appui préchargent tout de suite.
 */
const HOVER_PREFETCH_MS = 60;

/** Écoute les liens `href="#…"` de la page et rend de quoi arrêter. */
function prefetchLinks(prefetch: (hash: string) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hashOf = (event: Event): string | undefined => {
    const link = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
    const hash = link?.getAttribute("href");
    return hash === null || hash === undefined || hash === location.hash ? undefined : hash;
  };
  const onOver = (event: Event) => {
    clearTimeout(timer);
    const hash = hashOf(event);
    if (hash !== undefined) timer = setTimeout(() => prefetch(hash), HOVER_PREFETCH_MS);
  };
  const now = (event: Event) => {
    const hash = hashOf(event);
    if (hash !== undefined) prefetch(hash);
  };
  document.addEventListener("pointerover", onOver);
  document.addEventListener("pointerdown", now);
  document.addEventListener("focusin", now);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerdown", now);
    document.removeEventListener("focusin", now);
  };
}
