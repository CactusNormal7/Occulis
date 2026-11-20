import { Board } from "../board.js";
import type { Coord } from "../coord.js";
import type { PlayerId } from "../pieces/index.js";
import type { Deployment, TeamEntry } from "../team.js";
import type { Scenario } from "./scenario.js";

/**
 * Un plateau de 9 × 9 dans l'esprit de la maquette de l'ATH (docs/mockups/ath/) : coins
 * relevés en gradins, reliefs épars et deux cases manquantes au bord. Les blocs de
 * hauteur 3 dessinent au milieu une ligne brisée — la brèche — qui coupe toute vue d'une
 * zone de déploiement à l'autre (choix du porteur du projet, 2026-11-20) : le placement
 * de chacun reste caché jusqu'au premier contact, ce qu'un test vérifie. On la franchit
 * par ses trouées, au niveau du sol.
 *
 * Symétrique par rapport à son centre — `(x, y)` et `(8 - x, 8 - y)` se valent —, zones
 * et équipes par défaut comprises : aucun camp n'y est avantagé par le terrain.
 *
 * PROVISOIRE, comme le roster : aucune carte n'est actée (docs/design.md point ouvert 5).
 */
const MAP = [
  "221000122",
  "210000012",
  "133300331",
  "300033000",
  ".0300030.",
  "000330003",
  "133003331",
  "210000012",
  "221000122",
];

const SIZE = 9;

/** Le symétrique d'une case par rapport au centre de la carte : ce qui est au camp A, vu du camp B. */
function mirror(coord: Coord): Coord {
  return { x: SIZE - 1 - coord.x, y: SIZE - 1 - coord.y };
}

/** Les deux rangées du bas, gradins des coins compris : dix-huit cases pour six pièces. */
const ZONE_A: readonly Coord[] = Array.from({ length: 2 * SIZE }, (_, index) => ({
  x: index % SIZE,
  y: SIZE - 2 + Math.floor(index / SIZE),
}));

/** Le roi au fond, au milieu ; les pions devant lui ; les éclaireurs sur les ailes. */
const TEAM_A: readonly TeamEntry[] = [
  { kind: "commander", coord: { x: 4, y: 8 } },
  { kind: "scout", coord: { x: 2, y: 7 } },
  { kind: "scout", coord: { x: 6, y: 7 } },
  { kind: "scout", coord: { x: 4, y: 7 } },
  { kind: "pawn", coord: { x: 3, y: 7 } },
  { kind: "pawn", coord: { x: 5, y: 7 } },
];

const mirrored = (side: readonly TeamEntry[]): TeamEntry[] =>
  side.map((entry) => ({ ...entry, coord: mirror(entry.coord) }));

const DEPLOYMENT: Deployment = {
  zones: { A: ZONE_A, B: ZONE_A.map(mirror) } satisfies Record<PlayerId, readonly Coord[]>,
  defaultTeams: { A: TEAM_A, B: mirrored(TEAM_A) },
};

export const BREACH: Scenario = {
  name: "breach-1",
  board: () => Board.fromAscii(MAP),
  pieces: [],
  deployment: DEPLOYMENT,
};
