import type { IsoProjection, Tile } from "./paper.js";

/**
 * `cipher` et `plain` sont des états fixes d'un `CipherText` ; `decode` part des glyphes et
 * pose les lettres, `encode` fait l'inverse.
 */
export type CipherMode = "cipher" | "plain" | "decode" | "encode";

/** D'où part une inversion « papier » : un point de l'écran, ou une zone du plateau. */
export type PaperSource =
  | { readonly kind: "point"; readonly x: number; readonly y: number }
  | {
      readonly kind: "zone";
      readonly zone: readonly Tile[];
      readonly origin: Tile;
      readonly iso: IsoProjection;
      /** La taille de la grille du plateau, en cases. */
      readonly columns: number;
      readonly rows: number;
    };

export interface PaperRun {
  /** Changer la clé relance l'effet. */
  readonly key: number | string;
  readonly source: PaperSource;
}
