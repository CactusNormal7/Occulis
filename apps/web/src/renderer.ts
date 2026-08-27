import { Container, Graphics } from "pixi.js";
import { type Board, type Coord, type PlayerView, coordKey } from "@occulis/core";
import { type IsoProjection, depthOf, project } from "./iso.js";

const PALETTE = {
  tileVisible: 0x5a6675,
  tileFogged: 0x232932,
  tileFaceVisible: 0x151a21,
  tileFaceFogged: 0x11151b,
  pieceA: 0x74d3c4,
  pieceB: 0xe0785f,
} as const;

export interface RenderInput {
  readonly board: Board;
  readonly view: PlayerView;
  readonly projection: IsoProjection;
}

/** Dessine le plateau et les pièces en traits, sans aucune texture. */
export class SceneRenderer {
  readonly root = new Container();
  private readonly graphics = new Graphics();

  constructor() {
    this.root.addChild(this.graphics);
  }

  render({ board, view, projection }: RenderInput): void {
    const g = this.graphics;
    g.clear();

    const tiles = [...board.allTiles()].sort(
      (a, b) => depthOf(a.coord, projection) - depthOf(b.coord, projection),
    );

    for (const tile of tiles) {
      const lit = view.visible.has(coordKey(tile.coord));
      this.drawTile(g, tile.coord, tile.height, tile.passable, lit, projection);
    }

    for (const piece of view.ownPieces) {
      this.drawPiece(g, piece.coord, board.heightAt(piece.coord) ?? 0, projection, PALETTE.pieceA, 1);
    }
    for (const piece of view.visibleEnemies) {
      this.drawPiece(g, piece.coord, board.heightAt(piece.coord) ?? 0, projection, PALETTE.pieceB, 1);
    }
    for (const ghost of view.ghosts) {
      this.drawPiece(g, ghost.coord, board.heightAt(ghost.coord) ?? 0, projection, PALETTE.pieceB, 0.28);
    }
  }

  private drawTile(
    g: Graphics,
    coord: Coord,
    height: number,
    passable: boolean,
    lit: boolean,
    proj: IsoProjection,
  ): void {
    const top = project(coord, height, proj);
    const halfW = proj.tileWidth / 2;
    const halfH = proj.tileHeight / 2;
    const drop = height * proj.heightUnit;

    const north = { x: top.x, y: top.y - halfH };
    const east = { x: top.x + halfW, y: top.y };
    const south = { x: top.x, y: top.y + halfH };
    const west = { x: top.x - halfW, y: top.y };

    if (height > 0) {
      const faceColor = lit ? PALETTE.tileFaceVisible : PALETTE.tileFaceFogged;
      const edge = lit ? PALETTE.tileVisible : PALETTE.tileFogged;
      for (const [a, b] of [
        [west, south],
        [south, east],
      ] as const) {
        g.poly([a.x, a.y, b.x, b.y, b.x, b.y + drop, a.x, a.y + drop])
          .fill({ color: faceColor })
          .stroke({ width: 1, color: edge, alpha: lit ? 0.8 : 0.5 });
      }
    }

    g.poly([north.x, north.y, east.x, east.y, south.x, south.y, west.x, west.y])
      .fill({ color: lit ? PALETTE.tileFaceVisible : PALETTE.tileFaceFogged, alpha: 0.85 })
      .stroke({
        width: 1,
        color: lit ? PALETTE.tileVisible : PALETTE.tileFogged,
        alpha: passable ? 1 : 0.45,
      });
  }

  private drawPiece(
    g: Graphics,
    coord: Coord,
    terrainHeight: number,
    proj: IsoProjection,
    color: number,
    alpha: number,
  ): void {
    const base = project(coord, terrainHeight, proj);
    const stem = proj.heightUnit * 1.1;
    const halfW = proj.tileWidth * 0.18;

    g.moveTo(base.x, base.y)
      .lineTo(base.x, base.y - stem)
      .stroke({ width: 1.5, color, alpha });

    g.poly([
      base.x,
      base.y - stem - halfW * 0.9,
      base.x + halfW,
      base.y - stem,
      base.x,
      base.y - stem + halfW * 0.9,
      base.x - halfW,
      base.y - stem,
    ]).stroke({ width: 1.5, color, alpha });
  }
}
