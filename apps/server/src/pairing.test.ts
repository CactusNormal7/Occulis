import { describe, expect, it } from "vitest";
import { dequeue, enqueue, takePairing } from "./pairing.js";

const ANNE = { playerId: "anne", connectionId: "c1" };
const BORIS = { playerId: "boris", connectionId: "c2" };

describe("enqueue", () => {
  it("ajoute une attente à la fin", () => {
    expect(enqueue(enqueue([], ANNE), BORIS)).toEqual([ANNE, BORIS]);
  });

  it("remplace l'attente d'un joueur déjà en file", () => {
    // Sinon un joueur qui recharge sa page occuperait deux places et finirait
    // apparié avec lui-même.
    const reconnected = { playerId: "anne", connectionId: "c3" };
    expect(enqueue(enqueue([], ANNE), reconnected)).toEqual([reconnected]);
  });
});

describe("dequeue", () => {
  it("retire l'attente d'une connexion", () => {
    expect(dequeue([ANNE, BORIS], "c1")).toEqual([BORIS]);
  });

  it("ignore une connexion absente", () => {
    expect(dequeue([ANNE], "c9")).toEqual([ANNE]);
  });
});

describe("takePairing", () => {
  it("n'apparie rien avec moins de deux joueurs", () => {
    expect(takePairing([])).toEqual({ pairing: undefined, rest: [] });
    expect(takePairing([ANNE])).toEqual({ pairing: undefined, rest: [ANNE] });
  });

  it("apparie les deux plus anciennes attentes et laisse le reste", () => {
    const carla = { playerId: "carla", connectionId: "c3" };
    expect(takePairing([ANNE, BORIS, carla])).toEqual({
      pairing: { a: ANNE, b: BORIS },
      rest: [carla],
    });
  });
});
