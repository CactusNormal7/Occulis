import {
  CURRENT_RULESET_VERSION,
  DEFAULT_SCENARIO,
  applyAction,
  createGame,
  deployTeams,
  emptyKnowledge,
  observe,
  rulesetFor,
  scenarioFor,
  type Coord,
  type GameState,
  type PieceId,
  type PlayerKnowledge,
} from "@occulis/core";

/**
 * Le petit scénario du hero, joué par le vrai moteur sur la carte des nouvelles parties
 * (`ridge-1`, provisoire comme toutes les cartes) avec les équipes par défaut. Module pur :
 * ni DOM ni canevas, pour que le test vérifie que chaque coup reste légal quand `core`
 * change.
 *
 * L'histoire tient en cinq coups, vus du camp A : un éclaireur s'approche du col de
 * l'arête, y grimpe (un niveau, un tour entier : docs/design.md 5.3), découvre tout le camp
 * adverse, puis redescend — il n'en reste que des fantômes (5.4). Les coups du camp B
 * alternent, comme en partie ; le premier se joue hors de vue.
 */
export interface Step {
  readonly pieceId: PieceId;
  readonly to: Coord;
}

export const SCRIPT: readonly Step[] = [
  { pieceId: "a-2", to: { x: 4, y: 5 } },
  { pieceId: "b-5", to: { x: 10, y: 4 } },
  { pieceId: "a-2", to: { x: 5, y: 4 } },
  { pieceId: "b-2", to: { x: 11, y: 1 } },
  { pieceId: "a-2", to: { x: 4, y: 5 } },
];

/** Le camp dont on suit la vue. */
export const VIEWER = "A" as const;

/** Une position du scénario et ce que le camp A en sait. `move` est le coup qui y mène. */
export interface Frame {
  readonly state: GameState;
  readonly knowledge: PlayerKnowledge;
  readonly move?: { readonly pieceId: PieceId; readonly from: Coord; readonly to: Coord };
}

/** Les images nommées du scénario, celles que `scripts/capture.mjs` photographie. */
export const FRAMES = { fog: 1, summit: 3, ghosts: 5 } as const;

export function buildFrames(): Frame[] {
  const scenario = scenarioFor(DEFAULT_SCENARIO);
  const ruleset = rulesetFor(CURRENT_RULESET_VERSION);
  if (scenario.deployment === undefined)
    throw new Error("La carte du hero n'a pas de déploiement.");
  const pieces = deployTeams(ruleset, scenario.deployment, scenario.deployment.defaultTeams);
  if (!pieces.ok) throw new Error(`Équipes par défaut refusées : ${pieces.error.error.code}`);

  let state = createGame(scenario.board(), ruleset, pieces.value);
  let knowledge = observe(emptyKnowledge(VIEWER), state);
  const frames: Frame[] = [{ state, knowledge }];
  for (const step of SCRIPT) {
    const from = state.pieces.get(step.pieceId)?.coord;
    if (from === undefined) throw new Error(`Pièce inconnue : ${step.pieceId}`);
    const next = applyAction(state, { kind: "move", pieceId: step.pieceId, to: step.to });
    if (!next.ok) throw new Error(`Coup refusé (${step.pieceId}) : ${next.error.code}`);
    state = next.value;
    knowledge = observe(knowledge, state);
    frames.push({ state, knowledge, move: { pieceId: step.pieceId, from, to: step.to } });
  }
  return frames;
}
