/**
 * Le cache des lectures de l'interface. Pur — ni React ni DOM — pour porter les tests ;
 * `hooks.tsx` n'en est qu'une enveloppe.
 *
 * La convention qu'il sert (docs/technical/engine.md, « Chargement et premier rendu ») :
 * **un écran apparaît d'un seul tenant**. Tout ce qu'il lit est demandé en même temps,
 * chaque ressource une seule fois quel que soit le nombre de vues qui la lisent, et rien
 * ne s'affiche tant que tout n'est pas arrivé. Une ressource déjà lue revient aussitôt,
 * puis se relit si elle n'est plus fraîche.
 *
 * En mémoire seulement, par décision : rien de ce qu'un joueur a lu n'est écrit sur le
 * poste, et le cache meurt avec la page.
 */

export type Outcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

/** Une lecture nommée : la clé dit ce qui est lu, `load` comment. */
export interface Resource<T> {
  readonly key: string;
  readonly load: () => Promise<Outcome<T>>;
}

export function resource<T>(key: string, load: () => Promise<Outcome<T>>): Resource<T> {
  return { key, load };
}

/**
 * Ce qu'une vue reçoit, une fois sa ressource arrivée — jamais avant : l'attente ne se
 * voit pas dans la vue, elle est portée par l'écran entier. `refreshing` : une relecture
 * est en cours, la valeur montrée peut encore changer.
 */
export type Loaded<T> =
  | { readonly state: "failed"; readonly message: string }
  | { readonly state: "ready"; readonly value: T; readonly refreshing: boolean };

/**
 * L'état d'une clé. `outcome` absent : jamais lue. `pending` : la lecture en cours, que
 * toute demande concurrente reprend au lieu d'en lancer une seconde.
 */
export interface Entry<T> {
  readonly outcome: Outcome<T> | undefined;
  readonly at: number;
  readonly pending: Promise<Outcome<T>> | undefined;
}

/**
 * Une réponse plus jeune que ce délai n'est pas relue. Il absorbe le doublon entre le
 * préchargement d'un écran et le montage de ses vues, qui relisent ce qu'elles affichent.
 */
export const FRESH_MS = 3000;

/**
 * Le nombre de lectures en cours dans la page, que la barre de progression suit. Ses
 * abonnés sont prévenus après coup (microtâche) : une lecture peut démarrer pendant un
 * rendu React, qui ne doit déclencher aucune mise à jour d'un autre composant.
 */
export class PendingCount {
  private count = 0;
  private readonly listeners = new Set<() => void>();
  private scheduled = false;

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
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      for (const listener of this.listeners) listener();
    });
  }
}

export class LoadCache {
  private readonly entries = new Map<string, Entry<unknown>>();
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(
    readonly pending: PendingCount = new PendingCount(),
    private readonly now: () => number = Date.now,
  ) {}

  /** L'état d'une clé, tel quel : le même objet tant qu'il n'a pas changé. */
  peek<T>(key: string): Entry<T> | undefined {
    return this.entries.get(key) as Entry<T> | undefined;
  }

  /** La dernière valeur lue avec succès, s'il y en a une. */
  value<T>(key: string): T | undefined {
    const outcome = this.peek<T>(key)?.outcome;
    return outcome?.ok === true ? outcome.value : undefined;
  }

  /**
   * Lit une ressource, une seule fois à la fois. Rend la lecture en cours s'il y en a
   * une, la réponse connue si elle est fraîche (sauf `force`), et sinon en lance une.
   * La promesse ne rejette jamais : un échec est une réponse comme une autre, qu'une vue
   * affiche.
   */
  request<T>(resource: Resource<T>, options: { force?: boolean } = {}): Promise<Outcome<T>> {
    const { key } = resource;
    const entry = this.peek<T>(key);
    if (entry?.pending !== undefined) return entry.pending;
    if (options.force !== true && entry?.outcome !== undefined && this.now() - entry.at < FRESH_MS) {
      return Promise.resolve(entry.outcome);
    }

    const done = this.pending.begin();
    const promise = resource
      .load()
      .catch((error: unknown): Outcome<T> => ({ ok: false, message: String(error) }))
      .then((outcome) => {
        this.write(key, { outcome, at: this.now(), pending: undefined }, true);
        return outcome;
      })
      .finally(done);
    // Une clé jamais lue n'est affichée nulle part : inutile de prévenir qui que ce soit,
    // et ce départ peut avoir lieu pendant un rendu. Une clé déjà affichée passe, elle,
    // en relecture, ce que ses vues montrent.
    this.write(key, { outcome: entry?.outcome, at: entry?.at ?? 0, pending: promise }, entry?.outcome !== undefined);
    return promise;
  }

  /** Lance la lecture de plusieurs ressources à la fois, sans attendre. */
  preload(resources: readonly Resource<unknown>[]): void {
    for (const resource of resources) void this.request(resource);
  }

  /** Une valeur obtenue autrement (une réponse d'écriture, une poussée) devient la référence. */
  set<T>(key: string, value: T): void {
    const entry = this.peek<T>(key);
    this.write(key, { outcome: { ok: true, value }, at: this.now(), pending: entry?.pending }, true);
  }

  /** Oublie les clés qui commencent par `prefix`, ou toutes sans préfixe. */
  invalidate(prefix?: string): void {
    for (const key of [...this.entries.keys()]) {
      if (prefix === undefined || key.startsWith(prefix)) {
        this.entries.delete(key);
        this.notify(key);
      }
    }
  }

  subscribe(key: string, listener: () => void): () => void {
    let set = this.listeners.get(key);
    if (set === undefined) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  private write(key: string, entry: Entry<unknown>, notify: boolean): void {
    this.entries.set(key, entry);
    if (notify) this.notify(key);
  }

  private notify(key: string): void {
    for (const listener of this.listeners.get(key) ?? []) listener();
  }
}

/** Ce qu'une vue voit d'une clé dont la réponse est arrivée. */
export function loadedOf<T>(entry: Entry<T> & { outcome: Outcome<T> }): Loaded<T> {
  if (!entry.outcome.ok) return { state: "failed", message: entry.outcome.message };
  return { state: "ready", value: entry.outcome.value, refreshing: entry.pending !== undefined };
}

/** Les instances de la page : une seule mémoire et un seul compteur par document. */
export const pendingLoads = new PendingCount();
export const loadCache = new LoadCache(pendingLoads);
