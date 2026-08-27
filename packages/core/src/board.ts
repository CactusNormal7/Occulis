import { type Coord, type CoordKey, coordKey } from "./coord.js";

export interface Tile {
  readonly coord: Coord;
  /**
   * Hauteur du terrain (0 = niveau sol). Un mur n'est pas un flag mais une case
   * haute : c'est la hauteur seule qui bloque la ligne de vue.
   * Cf. docs/design.md section 5.1.
   */
  readonly height: number;
  /**
   * Franchissable par une pièce. Orthogonal à la hauteur : un gouffre est
   * infranchissable sans pour autant bloquer la vue. N'intervient jamais dans le
   * calcul de LOS.
   */
  readonly passable: boolean;
}

export interface TileSpec {
  readonly coord: Coord;
  readonly height?: number;
  readonly passable?: boolean;
}

/** Plateau immuable. Une case absente est hors-carte : ni franchissable, ni occultante. */
export class Board {
  private readonly tiles: ReadonlyMap<CoordKey, Tile>;

  constructor(specs: Iterable<TileSpec>) {
    const tiles = new Map<CoordKey, Tile>();
    for (const spec of specs) {
      tiles.set(coordKey(spec.coord), {
        coord: spec.coord,
        height: spec.height ?? 0,
        passable: spec.passable ?? true,
      });
    }
    this.tiles = tiles;
  }

  get tileCount(): number {
    return this.tiles.size;
  }

  getTile(coord: Coord): Tile | undefined {
    return this.tiles.get(coordKey(coord));
  }

  contains(coord: Coord): boolean {
    return this.tiles.has(coordKey(coord));
  }

  /** Hauteur de la case, ou undefined hors-carte. */
  heightAt(coord: Coord): number | undefined {
    return this.tiles.get(coordKey(coord))?.height;
  }

  isPassable(coord: Coord): boolean {
    return this.tiles.get(coordKey(coord))?.passable ?? false;
  }

  allTiles(): IterableIterator<Tile> {
    return this.tiles.values();
  }

  static flat(width: number, height: number, terrainHeight = 0): Board {
    const specs: TileSpec[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        specs.push({ coord: { x, y }, height: terrainHeight });
      }
    }
    return new Board(specs);
  }

  /**
   * Construit un plateau depuis une carte texte, pour les tests et le prototypage.
   * Une ligne = un `y` croissant, un caractère = un `x` croissant.
   *   `0`-`9` : case franchissable de cette hauteur
   *   `.`     : hors-carte (aucune case)
   *   `~`     : case infranchissable de hauteur 0 (gouffre, eau — n'occulte pas)
   */
  static fromAscii(rows: readonly string[]): Board {
    const specs: TileSpec[] = [];
    rows.forEach((row, y) => {
      [...row].forEach((char, x) => {
        if (char === ".") return;
        if (char === "~") {
          specs.push({ coord: { x, y }, height: 0, passable: false });
          return;
        }
        const height = Number.parseInt(char, 10);
        if (Number.isNaN(height)) {
          throw new Error(`Board.fromAscii: caractère invalide "${char}" en (${x},${y})`);
        }
        specs.push({ coord: { x, y }, height });
      });
    });
    return new Board(specs);
  }
}
