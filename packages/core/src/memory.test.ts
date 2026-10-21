import { describe, expect, it } from "vitest";
import { type Action, legalActions } from "./actions.js";
import { type CoordKey, coordKey } from "./coord.js";
import { type MatchMemory, advanceMemory, replayMemory, startMemory, viewFor } from "./fog.js";
import { CURRENT_RULESET_VERSION, rulesetFor } from "./rulesets/index.js";
import { DEFAULT_SCENARIO, scenarioFor } from "./scenarios/index.js";
import { createGame } from "./state.js";
import { deployTeams } from "./team.js";

/**
 * Le serveur avance la partie coup par coup (`advanceMemory`) ; après une hibernation, il
 * la reconstruit d'un bloc depuis le log (`replayMemory`). Les deux chemins doivent rendre
 * exactement les mêmes vues, mémoire fantôme comprise — sinon un joueur verrait sa
 * connaissance changer au réveil du Durable Object.
 */
function startingPosition() {
  const scenario = scenarioFor(DEFAULT_SCENARIO);
  const ruleset = rulesetFor(CURRENT_RULESET_VERSION);
  if (scenario.deployment === undefined) throw new Error("carte sans déploiement");
  const pieces = deployTeams(ruleset, scenario.deployment, scenario.deployment.defaultTeams);
  if (!pieces.ok) throw new Error("équipes par défaut invalides");
  return createGame(scenario.board(), ruleset, pieces.value);
}

const views = (memory: MatchMemory) =>
  JSON.stringify(
    (["A", "B"] as const).map((player) => {
      const view = viewFor(memory.state, memory.knowledge[player]);
      return { ...view, visible: [...view.visible] };
    }),
  );

describe("MatchMemory : avancer coup par coup ou rejouer le log", () => {
  it("rend les mêmes vues aux deux camps, tous les 20 coups", () => {
    const start = startingPosition();
    let live = startMemory(start);
    const log: Action[] = [];
    // Un choix de coup fixe, mais varié : pas toujours le premier coup légal.
    for (let move = 0; move < 120; move++) {
      const legal = legalActions(live.state);
      const action = legal[(move * 7) % legal.length];
      if (action === undefined) break;
      const advanced = advanceMemory(live, action);
      if (!advanced.ok) throw new Error(`coup ${move} refusé`);
      live = advanced.value;
      log.push(action);

      // Un rejeu complet à chaque coup coûterait le carré de la partie : on compare à
      // intervalles réguliers, ce qui suffit à attraper une divergence qui s'accumule.
      if ((move + 1) % 20 !== 0) continue;
      const replayed = replayMemory(start, log);
      if (!replayed.ok) throw new Error(`rejeu interrompu au coup ${move}`);
      expect(views(replayed.value)).toBe(views(live));
    }
    expect(log.length).toBe(120);
  });
});

/**
 * Le fog ne doit rien trahir par l'ombre (docs/design.md section 5.2) : ce qu'un joueur
 * peut recalculer à partir de ce qu'il connaît — le relief, ses pièces, les ennemis
 * qu'il voit — est exactement ce que le serveur lui dit voir. Sans la règle « une pièce
 * qui bloque une ligne de vue est visible », une pièce cachée éteignait des cases, et
 * l'écart la localisait.
 */
describe("la vue transmise ne trahit aucune pièce cachée", () => {
  it("se recalcule entièrement depuis ce que le joueur connaît", () => {
    let memory = startMemory(startingPosition());
    for (let move = 0; move < 300; move++) {
      const { state } = memory;
      for (const player of ["A", "B"] as const) {
        const seen = memory.knowledge[player].visible;
        const known = new Set(
          [...state.pieces.values()]
            .filter((piece) => piece.owner === player || seen.has(coordKey(piece.coord)))
            .map((piece) => coordKey(piece.coord)),
        );
        const recomputed = new Set<string>();
        for (const piece of state.pieces.values()) {
          if (piece.owner !== player) continue;
          for (const key of state.ruleset
            .typeOf(piece)
            .fieldOfView(state.board, piece.coord, known))
            recomputed.add(key);
        }
        expect([...recomputed].filter((key) => !seen.has(key as CoordKey))).toEqual([]);
      }
      const legal = legalActions(state);
      const action = legal[(move * 7) % legal.length];
      if (action === undefined) break;
      const advanced = advanceMemory(memory, action);
      if (!advanced.ok) throw new Error(`coup ${move} refusé`);
      memory = advanced.value;
    }
  });
});
