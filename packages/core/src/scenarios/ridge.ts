import { Board } from "../board.js";
import type { Coord } from "../coord.js";
import type { PlayerId } from "../pieces/index.js";
import type { Deployment, TeamEntry } from "../team.js";
import type { Scenario } from "./scenario.js";

/**
 * Une arête en diagonale, d'un bord à l'autre, sépare deux zones de déploiement en coins
 * opposés. La carte est symétrique par rapport à son centre — `(x, y)` et
 * `(13 - x, 9 - y)` se valent —, zones et équipes par défaut comprises : aucun camp n'y
 * est avantagé par le terrain.
 *
 * L'arête culmine à 3, sauf un col de hauteur 1 en son milieu : on la franchit en
 * grimpant (implementation-notes #9), et elle coupe la vue partout, col compris — un
 * obstacle à hauteur du regard bloque (implementation-notes #11). Les deux zones n'ont
 * donc **aucune ligne de vue mutuelle** : le placement de chacun reste caché à l'autre
 * jusqu'au premier contact (docs/design.md section 7), ce qu'un test vérifie.
 *
 * PROVISOIRE, comme le roster : aucune carte n'est actée (docs/design.md point ouvert 5).
 */
const MAP = [
  "13100000000000",
  "01310000000000",
  "00133100000000",
  "00001310000000",
  "00000111000000",
  "00000011100000",
  "00000001310000",
  "00000000133100",
  "00000000001310",
  "00000000000131",
];

const WIDTH = 14;
const HEIGHT = 10;

/** Le symétrique d'une case par rapport au centre de la carte : ce qui est au camp A, vu du camp B. */
function mirror(coord: Coord): Coord {
  return { x: WIDTH - 1 - coord.x, y: HEIGHT - 1 - coord.y };
}

/** Le coin bas-gauche, 4 × 4 cases : de quoi poser huit pièces en choisissant. */
const ZONE_A: readonly Coord[] = Array.from({ length: 16 }, (_, index) => ({ x: index % 4, y: 6 + Math.floor(index / 4) }));

/** Les pions devant, vers l'arête ; les éclaireurs derrière eux ; la maîtresse au coin. */
const TEAM_A: readonly TeamEntry[] = [
  { kind: "commander", coord: { x: 0, y: 9 } },
  { kind: "scout", coord: { x: 1, y: 7 } },
  { kind: "scout", coord: { x: 2, y: 7 } },
  { kind: "scout", coord: { x: 3, y: 8 } },
  { kind: "pawn", coord: { x: 1, y: 6 } },
  { kind: "pawn", coord: { x: 2, y: 6 } },
  { kind: "pawn", coord: { x: 3, y: 6 } },
  { kind: "pawn", coord: { x: 3, y: 7 } },
];

const mirrored = (side: readonly TeamEntry[]): TeamEntry[] => side.map((entry) => ({ ...entry, coord: mirror(entry.coord) }));

const DEPLOYMENT: Deployment = {
  zones: { A: ZONE_A, B: ZONE_A.map(mirror) } satisfies Record<PlayerId, readonly Coord[]>,
  defaultTeams: { A: TEAM_A, B: mirrored(TEAM_A) },
};

export const RIDGE: Scenario = {
  name: "ridge-1",
  board: () => Board.fromAscii(MAP),
  pieces: [],
  deployment: DEPLOYMENT,
};
