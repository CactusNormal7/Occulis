import type { MeMatchDebrief } from "@occulis/protocol";
import type { Outcome } from "../load/cache.js";
import type { FlowEvent } from "../ui/flow.js";

/**
 * L'écran de fin d'une partie jouée (`debrief/`), et son lien `/debrief/:id`, que le
 * Worker sert comme la page du jeu.
 *
 * Il s'ouvre à la clôture de la partie, ou en arrivant par son lien ; il ne paraît
 * qu'une fois sa lecture arrivée. Le quitter, quel qu'en soit le chemin — menu, nouvelle
 * partie, défi accepté, déconnexion —, le dit au serveur, qui le ferme pour de bon quand
 * les deux joueurs l'ont quitté : **le serveur est seul juge** de l'accès, le client ne
 * fait que l'en informer. Module pur : l'adresse, le réseau et les écrans lui sont donnés.
 */

const LINK = /^\/debrief\/([\w-]+)$/;

export function debriefPath(matchId: string): string {
  return `/debrief/${matchId}`;
}

/** La partie dont l'adresse est l'écran de fin, `undefined` pour toute autre adresse. */
export function debriefFromPath(pathname: string): string | undefined {
  return LINK.exec(pathname)?.[1];
}

export interface DebriefEffects {
  /** Lit l'écran de fin, sans reprendre une lecture en cache. */
  readonly load: (matchId: string) => Promise<Outcome<MeMatchDebrief>>;
  /** Note le départ du joueur ; sans attendre de réponse. */
  readonly leave: (matchId: string) => void;
  readonly go: (event: FlowEvent) => void;
  /** Remplace l'adresse sans recharger ni empiler d'entrée d'historique. */
  readonly setPath: (path: string) => void;
  readonly showIslands: () => void;
}

/**
 * `opened` : l'écran est là ; `refused` : fermé ou illisible, `message` dit pourquoi ;
 * `stale` : une autre demande (fermeture, autre partie) a pris sa place entre-temps.
 */
export type DebriefOpening =
  | { readonly kind: "opened" }
  | { readonly kind: "refused"; readonly message: string }
  | { readonly kind: "stale" };

export class Debrief {
  private shown: string | undefined;
  private opening: string | undefined;

  constructor(private readonly effects: DebriefEffects) {}

  /** La partie dont l'écran de fin est montré. */
  get matchId(): string | undefined {
    return this.shown;
  }

  async open(matchId: string): Promise<DebriefOpening> {
    // Une vue finale peut revenir (reconnexion) : l'écran déjà demandé ne se redemande pas.
    if (this.shown === matchId || this.opening === matchId) return { kind: "stale" };
    this.opening = matchId;
    const outcome = await this.effects.load(matchId);
    if (this.opening !== matchId) return { kind: "stale" };
    this.opening = undefined;
    if (!outcome.ok) {
      this.effects.setPath("/");
      return { kind: "refused", message: outcome.message };
    }
    this.shown = matchId;
    this.effects.setPath(debriefPath(matchId));
    this.effects.showIslands();
    this.effects.go({ kind: "debrief", matchId });
    return { kind: "opened" };
  }

  /** Quitte l'écran : le départ part au serveur, l'adresse revient à la racine. */
  close(): void {
    this.opening = undefined;
    const left = this.shown;
    if (left === undefined) return;
    this.shown = undefined;
    this.effects.leave(left);
    this.effects.setPath("/");
    this.effects.showIslands();
  }
}
