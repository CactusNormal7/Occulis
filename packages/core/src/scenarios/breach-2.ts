import { Board } from "../board.js";
import type { Coord } from "../coord.js";
import type { PlayerId } from "../pieces/index.js";
import type { Deployment, TeamEntry } from "../team.js";
import type { Scenario } from "./scenario.js";

/**
 * `breach-1` élargie à 11 × 11 et dénouée (demande du porteur du projet, 2026-11-20) :
 * deux cases de plus dans chaque sens, et un relief plus bas et plus épars. Plus aucun
 * bloc de hauteur 3 : des murets d'un niveau, quelques rebords de deux. Les deux rangées
 * de déploiement sont planes, pour qu'aucune pièce n'y regarde de haut.
 *
 * Un muret d'un niveau suffit à couper la vue entre deux pièces au sol (le regard est à
 * un niveau au-dessus de la case, `los.ts`) : la brèche du milieu, faite de murets
 * décalés, cache encore chaque zone de déploiement à l'autre, ce qu'un test vérifie. Elle
 * se franchit par ses trouées, ou en grimpant d'un niveau.
 *
 * Symétrique par rapport à son centre — `(x, y)` et `(10 - x, 10 - y)` se valent —, zones
 * et équipes par défaut comprises.
 *
 * PROVISOIRE, comme le roster : aucune carte n'est actée (docs/design.md point ouvert 5).
 */
const MAP = [
  "00000000000",
  "00000000000",
  "01100002100",
  "21000000000",
  "00002110000",
  ".111010111.",
  "00001120000",
  "00000000012",
  "00120000110",
  "00000000000",
  "00000000000",
];

const SIZE = 11;

/** Le symétrique d'une case par rapport au centre de la carte : ce qui est au camp A, vu du camp B. */
function mirror(coord: Coord): Coord {
  return { x: SIZE - 1 - coord.x, y: SIZE - 1 - coord.y };
}

/** Les deux rangées du bas : vingt-deux cases pour six pièces. */
const ZONE_A: readonly Coord[] = Array.from({ length: 2 * SIZE }, (_, index) => ({
  x: index % SIZE,
  y: SIZE - 2 + Math.floor(index / SIZE),
}));

/** Le roi au fond, au milieu ; les pions devant lui ; le trappeur au centre, le fou et la tour sur les ailes. */
const TEAM_A: readonly TeamEntry[] = [
  { kind: "commander", coord: { x: 5, y: 10 } },
  { kind: "bishop", coord: { x: 2, y: 9 } },
  { kind: "rook", coord: { x: 8, y: 9 } },
  { kind: "trapper", coord: { x: 5, y: 9 } },
  { kind: "pawn", coord: { x: 4, y: 9 } },
  { kind: "pawn", coord: { x: 6, y: 9 } },
];

const mirrored = (side: readonly TeamEntry[]): TeamEntry[] =>
  side.map((entry) => ({ ...entry, coord: mirror(entry.coord) }));

const DEPLOYMENT: Deployment = {
  zones: { A: ZONE_A, B: ZONE_A.map(mirror) } satisfies Record<PlayerId, readonly Coord[]>,
  defaultTeams: { A: TEAM_A, B: mirrored(TEAM_A) },
};

export const BREACH_2: Scenario = {
  name: "breach-2",
  board: () => Board.fromAscii(MAP),
  pieces: [],
  deployment: DEPLOYMENT,
};
