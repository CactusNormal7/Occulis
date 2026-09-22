import { Board } from "../board.js";
import type { Piece } from "../pieces/index.js";
import type { Scenario } from "./scenario.js";

/**
 * Une arête rocheuse en diagonale coupe la carte en deux moitiés sans vue mutuelle.
 *
 * PROVISOIRE, comme le roster : aucune carte n'est actée (docs/design.md point ouvert
 * 5), et celle-ci n'existe que pour donner à voir hauteur, occultation et fog of war
 * sur un cas concret. Elle ne doit servir de base à aucun équilibrage.
 */
const MAP = [
  "0000000000",
  "0011000000",
  "0013100000",
  "0001330000",
  "0000133000",
  "0000013100",
  "0000001100",
  "0000000000",
];

const PIECES: readonly Piece[] = [
  { id: "a-scout", kind: "scout", owner: "A", coord: { x: 1, y: 6 } },
  { id: "a-cmd", kind: "commander", owner: "A", coord: { x: 0, y: 7 } },
  { id: "b-scout", kind: "scout", owner: "B", coord: { x: 8, y: 1 } },
  { id: "b-cmd", kind: "commander", owner: "B", coord: { x: 9, y: 0 } },
];

export const DEMO: Scenario = {
  name: "demo-0",
  board: () => Board.fromAscii(MAP),
  pieces: PIECES,
};
