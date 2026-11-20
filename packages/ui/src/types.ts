/**
 * Les formes de données que les composants de la charte reçoivent : une option, une entrée
 * d'historique, un fait. Elles vivent ici plutôt que dans les composants pour que l'appelant
 * les importe sans dépendre d'un fichier `.vue`.
 */

/** Le camp d'une partie : il donne sa couleur à ce qui le désigne. */
export type Camp = "A" | "B";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Souligne l'option à la couleur d'un camp quand elle est choisie (un point de vue de joueur). */
  camp?: Camp | undefined;
  /** Fait de l'option un lien (un filtre porté par l'URL) plutôt qu'un bouton. */
  href?: string | undefined;
}

/** Une valeur proposée d'un clic : une durée, un montant, une entrée de liste déroulante. */
export interface ValueOption {
  value: string;
  label: string;
}

export interface TopBarTab {
  href: string;
  label: string;
  current?: boolean | undefined;
}

/** Un fait court : son nom et sa valeur, déjà mise en forme. */
export interface Fact {
  label: string;
  value: string | number;
  /** La valeur est un identifiant ou du code : montrée en monospace. */
  code?: boolean | undefined;
}

export interface MoveEntry {
  /** Le numéro affiché (« 3 »), ou « — » pour la position de départ. */
  number: string;
  /** Le camp qui a joué ; absent pour la position de départ. */
  seat?: Camp | undefined;
  /** Le coup, comme l'historique de la partie : « 2,4 → 3,4 », « abandon ». */
  text: string;
  /** Le coup ne peut pas être montré (rejeu interrompu avant lui). */
  disabled?: boolean | undefined;
}

export interface ThreadMessage {
  id: string;
  body: string;
  /** Écrit par le lecteur : aligné à droite, au trait franc. */
  mine: boolean;
  /** La précision sous le message : une heure, « lu ». */
  meta?: string | undefined;
}

export interface ToastMessage {
  id: number;
  text: string;
  ok: boolean;
  leaving?: boolean | undefined;
}

export interface VersusSide {
  name: string;
  href?: string | undefined;
}

export interface NavSection {
  label: string;
  items: readonly { href: string; label: string; current?: boolean | undefined }[];
}

/**
 * Les mises en page d'écran qu'un squelette sait imiter. `hero` : un bandeau d'identité puis
 * deux colonnes de cartes (un compte, une fiche) ; `list` : un titre puis une table ;
 * `detail` : un bandeau de faits puis un grand bloc (une partie et son plateau).
 */
export type SkeletonLayout = "hero" | "list" | "detail";
