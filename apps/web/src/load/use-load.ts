import {
  computed,
  onScopeDispose,
  shallowRef,
  watch,
  type ComputedRef,
  type ShallowRef,
} from "vue";
import { type Loaded, type Resource, loadCache, loadedOf, pendingLoads } from "./cache.js";

/**
 * Lit une ressource — **la** façon de lire une donnée dans une vue Vue du client
 * (docs/technical/engine.md, « Chargement et premier rendu »).
 *
 * S'emploie avec `await`, en tête du `<script setup>` d'une vue :
 *
 *     const { loaded, reload } = await useLoad(() => R.users(props.search, props.offset));
 *
 * Tant que la ressource n'est jamais arrivée, la vue est **en attente** : c'est la frontière
 * `<Suspense>` de la page qui attend, pour toutes les vues de l'écran à la fois, et l'écran
 * paraît d'un seul tenant. Arrivée, la ressource se relit en arrière-plan si elle n'est plus
 * fraîche ; `reload` la relit après une écriture, en gardant l'écran — l'écran montre ce que
 * la base contient, jamais ce qu'on vient d'envoyer.
 *
 * `source` est relue quand les props de la vue changent (une autre page de la table) : la
 * vue garde ce qu'elle montre jusqu'à l'arrivée de la nouvelle lecture.
 */
export async function useLoad<T>(
  source: () => Resource<T>,
): Promise<{ loaded: ComputedRef<Loaded<T>>; reload: () => void }> {
  const resource = computed(source);

  // Les abonnements se posent avant l'attente : passé le premier `await`, Vue ne sait plus à
  // quelle vue rattacher un observateur.
  const entry = useCacheEntry(resource);
  const reload = () => void loadCache.request(resource.value, { force: true });

  const firstOutcome = await loadCache.request(resource.value);

  /** La dernière réponse montrée, gardée pendant qu'une autre clé se lit. */
  let lastShown: Loaded<T> = loadedOf({ outcome: firstOutcome, at: 0, pending: undefined });
  const loaded = computed(() => {
    const current = entry.value;
    if (current?.outcome !== undefined)
      lastShown = loadedOf({ ...current, outcome: current.outcome });
    return lastShown;
  });

  return { loaded, reload };
}

/**
 * L'état de la ressource courante dans le cache, tenu à jour : chaque écriture de sa clé, et
 * chaque changement de clé, le relisent. Une clé oubliée (`invalidate`) se relit aussitôt.
 */
function useCacheEntry<T>(resource: ComputedRef<Resource<T>>) {
  const entry = shallowRef(loadCache.peek<T>(resource.value.key));

  watch(
    () => resource.value.key,
    (key, _previous, onCleanup) => {
      const refresh = () => {
        entry.value = loadCache.peek<T>(key);
        if (entry.value === undefined) void loadCache.request(resource.value);
      };
      onCleanup(loadCache.subscribe(key, refresh));
      void loadCache.request(resource.value);
      entry.value = loadCache.peek<T>(key);
    },
    { immediate: true },
  );

  return entry;
}

/** Vrai tant qu'au moins une lecture de la page est en cours : la barre de progression le suit. */
export function usePending(): Readonly<ShallowRef<boolean>> {
  const pending = shallowRef(pendingLoads.value > 0);
  const stop = pendingLoads.subscribe(() => {
    pending.value = pendingLoads.value > 0;
  });
  onScopeDispose(stop);
  return pending;
}
