/**
 * Le cache des lectures de l'interface, et la manière unique de décrire où en est une
 * lecture. Pur — ni React ni DOM — pour porter les tests ; `hooks.tsx` n'en est qu'une
 * enveloppe.
 *
 * La convention qu'il sert (docs/technical/engine.md, « Chargement et premier rendu ») :
 * une ressource déjà lue s'affiche **aussitôt** depuis ce cache, puis se relit en
 * arrière-plan. Une navigation ne repasse donc jamais par une page vide pour revenir sur
 * ce qu'elle a déjà montré.
 *
 * En mémoire seulement, par décision : rien de ce qu'un joueur a lu n'est écrit sur le
 * poste, et le cache meurt avec la page.
 */

export type Outcome<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

/**
 * `refreshing` : la valeur affichée vient du cache, ou d'une lecture précédente, et une
 * relecture est en cours. L'écran la montre sans attendre ; seule la barre de progression
 * dit qu'elle va peut-être changer.
 */
export type Loaded<T> =
  | { readonly state: "loading" }
  | { readonly state: "failed"; readonly message: string }
  | { readonly state: "ready"; readonly value: T; readonly refreshing: boolean };

export class LoadCache {
  private readonly values = new Map<string, unknown>();

  has(key: string): boolean {
    return this.values.has(key);
  }

  get<T>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }

  set(key: string, value: unknown): void {
    this.values.set(key, value);
  }

  /** Oublie les clés qui commencent par `prefix`, ou toutes sans préfixe. */
  invalidate(prefix?: string): void {
    for (const key of [...this.values.keys()]) {
      if (prefix === undefined || key.startsWith(prefix)) this.values.delete(key);
    }
  }

  /** L'état d'une lecture qui démarre : la valeur connue si elle existe, sinon l'attente. */
  initial<T>(key: string): Loaded<T> {
    return this.has(key)
      ? { state: "ready", value: this.get<T>(key) as T, refreshing: true }
      : { state: "loading" };
  }

  /** L'état une fois la réponse arrivée ; une réponse réussie entre au cache. */
  settle<T>(key: string, outcome: Outcome<T>): Loaded<T> {
    if (!outcome.ok) return { state: "failed", message: outcome.message };
    this.set(key, outcome.value);
    return { state: "ready", value: outcome.value, refreshing: false };
  }
}

/** Une relecture garde ce qui est affiché : seule une première lecture attend à vide. */
export function refreshing<T>(loaded: Loaded<T>): Loaded<T> {
  return loaded.state === "ready" ? { ...loaded, refreshing: true } : loaded;
}

/**
 * Le nombre de lectures en cours dans la page, que la barre de progression suit. Un
 * compteur et non un booléen par lecture : plusieurs vues lisent en même temps.
 */
export class PendingCount {
  private count = 0;
  private readonly listeners = new Set<() => void>();

  get value(): number {
    return this.count;
  }

  begin(): () => void {
    this.change(+1);
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      this.change(-1);
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private change(delta: number): void {
    this.count += delta;
    for (const listener of this.listeners) listener();
  }
}

/** Les instances de la page : une seule mémoire et un seul compteur par document. */
export const loadCache = new LoadCache();
export const pendingLoads = new PendingCount();
