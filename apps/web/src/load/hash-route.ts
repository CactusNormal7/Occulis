import { computed, onScopeDispose, shallowRef, type ComputedRef, type ShallowRef } from "vue";
import { type Resource, loadCache } from "./cache.js";
import { prefetchLinks } from "./prefetch-links.js";

/** Une route affichée et celle que vise la dernière navigation. */
export interface HashRoute<R> {
  /** La route dont l'écran est affiché. */
  readonly route: Readonly<ShallowRef<R>>;
  /** La route du fragment : celle de la barre du haut, dès le clic. */
  readonly target: Readonly<ShallowRef<R>>;
  /**
   * Vrai quand la navigation change d'écran et que le suivant n'est pas arrivé : la page
   * montre alors le squelette de `target` à la place de l'écran de `route`.
   */
  readonly switching: ComputedRef<boolean>;
}

/**
 * La route lue dans le fragment de l'URL. Une navigation est **immédiate** : la barre du
 * haut passe à la route visée (`target`) dès le clic. Si tout ce que l'écran suivant lit est
 * déjà là, il remplace aussitôt l'écran affiché ; sinon `route` attend que tout soit arrivé,
 * et pendant l'attente `switching` dit de montrer son squelette — sauf entre deux états
 * d'un même écran (`screenOf` : une page de table, une recherche), où l'écran affiché reste
 * en place.
 *
 * Tout lien vers un fragment de la page précharge sa route au survol, au focus et à
 * l'appui : le plus souvent, l'écran est arrivé avant le relâchement du clic.
 */
export function useHashRoute<R>(
  parse: (hash: string) => R,
  resourcesOf: (route: R) => readonly Resource<unknown>[],
  screenOf: (route: R) => string,
): HashRoute<R> {
  const route = shallowRef(parse(location.hash));
  const target = shallowRef(route.value);

  async function navigate() {
    const next = parse(location.hash);
    const resources = resourcesOf(next);
    target.value = next;
    if (!resources.every(arrived)) {
      await Promise.all(resources.map((resource) => loadCache.request(resource)));
      // Une navigation plus récente est partie pendant l'attente : c'est elle qui l'emporte.
      if (target.value !== next) return;
    }
    route.value = next;
  }

  const onHashChange = () => void navigate();
  window.addEventListener("hashchange", onHashChange);
  const stopPrefetch = prefetchLinks((hash) => loadCache.preload(resourcesOf(parse(hash))));
  onScopeDispose(() => {
    window.removeEventListener("hashchange", onHashChange);
    stopPrefetch();
  });

  const switching = computed(() => screenOf(target.value) !== screenOf(route.value));
  return { route, target, switching };
}

/** Une ressource déjà lue au moins une fois : son écran peut paraître sans attendre. */
function arrived(resource: Resource<unknown>): boolean {
  return loadCache.peek(resource.key)?.outcome !== undefined;
}
