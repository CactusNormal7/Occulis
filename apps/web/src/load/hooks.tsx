import { type ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { EmptyState, Skeleton } from "@occulis/ui";
import { type Loaded, type Outcome, loadCache, pendingLoads, refreshing } from "./cache.js";

/**
 * Charge une ressource et la recharge à la demande — **la** façon de lire une donnée dans
 * une vue React du client (docs/technical/engine.md, « Chargement et premier rendu »).
 *
 * - Une clé déjà lue rend aussitôt sa valeur en cache, dès le premier rendu : aucun rendu
 *   vide intermédiaire, puis la relecture la remplace.
 * - Une réponse arrivée après un changement de `key` n'est pas affichée : une navigation
 *   rapide ne doit jamais montrer la vue d'avant. Elle entre quand même au cache, où elle
 *   reste juste pour sa propre clé.
 * - `reload` relit depuis le serveur après une écriture, en gardant l'écran affiché :
 *   l'écran montre ce que la base contient, jamais ce qu'on vient d'envoyer.
 */
export function useLoad<T>(
  key: string,
  load: () => Promise<Outcome<T>>,
): { loaded: Loaded<T>; reload: () => void } {
  const [entry, setEntry] = useState<{ key: string; loaded: Loaded<T> }>(() => ({
    key,
    loaded: loadCache.initial<T>(key),
  }));
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let current = true;
    const done = pendingLoads.begin();
    setEntry((previous) => ({
      key,
      loaded: previous.key === key ? refreshing(previous.loaded) : loadCache.initial<T>(key),
    }));
    void load()
      .then((outcome) => {
        const settled = loadCache.settle(key, outcome);
        if (current) setEntry({ key, loaded: settled });
      })
      .finally(done);
    return () => {
      current = false;
      done();
    };
    // `load` change d'identité à chaque rendu : c'est `key` qui dit quand la ressource
    // change vraiment, et `generation` quand il faut la relire.
  }, [key, generation]);

  const reload = useCallback(() => setGeneration((value) => value + 1), []);
  // Le rendu qui suit un changement de clé précède l'effet : il lit déjà le cache de la
  // nouvelle clé plutôt que de montrer, une image durant, la valeur de l'ancienne.
  return { loaded: entry.key === key ? entry.loaded : loadCache.initial<T>(key), reload };
}

/** Vrai tant qu'au moins une lecture de la page est en cours : la barre de progression le suit. */
export function usePending(): boolean {
  return useSyncExternalStore(
    (listener) => pendingLoads.subscribe(listener),
    () => pendingLoads.value > 0,
  );
}

/**
 * Ce qu'une vue montre selon l'état de sa ressource : sa place réservée tant qu'elle
 * n'est pas là (un squelette par défaut, jamais rien), le message s'il a échoué, sinon
 * son rendu.
 */
export function whenReady<T>(
  loaded: Loaded<T>,
  render: (value: T) => ReactNode,
  placeholder: ReactNode = <Skeleton card />,
): ReactNode {
  if (loaded.state === "loading") return placeholder;
  if (loaded.state === "failed") return <EmptyState error>{loaded.message}</EmptyState>;
  return render(loaded.value);
}
