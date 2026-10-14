import { describe, expect, it } from "vitest";
import { requeueFront } from "./pairing.js";
import { ACCEPT_MS, accept, expire, isSettled, nextDeadline, propose, proposalOfPlayer, withdraw } from "./proposals.js";

const anne = { playerId: "anne", connectionId: "c-anne" };
const boris = { playerId: "boris", connectionId: "c-boris" };
const carla = { playerId: "carla", connectionId: "c-carla" };

describe("propositions", () => {
  const proposal = propose("p1", anne, boris, 1000);

  it("laisse quinze secondes pour accepter", () => {
    expect(proposal.deadline).toBe(1000 + ACCEPT_MS);
    expect(nextDeadline([proposal, propose("p2", carla, anne, 0)])).toBe(ACCEPT_MS);
    expect(nextDeadline([])).toBeUndefined();
  });

  it("n'est réglée qu'une fois acceptée des deux côtés", () => {
    const once = accept([proposal], "p1", "c-anne");
    expect(once.proposal && isSettled(once.proposal)).toBe(false);
    const twice = accept(once.proposals, "p1", "c-boris");
    expect(twice.proposal && isSettled(twice.proposal)).toBe(true);
  });

  it("ignore l'acceptation d'une connexion étrangère ou d'une proposition inconnue", () => {
    expect(accept([proposal], "p1", "c-carla").proposal).toBeUndefined();
    expect(accept([proposal], "p9", "c-anne").proposal).toBeUndefined();
  });

  it("remet en file qui avait accepté quand l'autre refuse", () => {
    const { proposals } = accept([proposal], "p1", "c-anne");
    const { proposals: left, lapse } = withdraw(proposals, "c-boris");
    expect(left).toEqual([]);
    expect(lapse?.requeue).toEqual([anne]);
    expect(lapse?.dropped).toEqual([boris]);
  });

  it("sort de la file tous ceux qui n'ont pas accepté à l'échéance", () => {
    const { proposals } = accept([proposal], "p1", "c-boris");
    expect(expire(proposals, proposal.deadline - 1).lapses).toEqual([]);
    const { proposals: left, lapses } = expire(proposals, proposal.deadline);
    expect(left).toEqual([]);
    expect(lapses[0]?.requeue).toEqual([boris]);
    expect(lapses[0]?.dropped).toEqual([anne]);
  });

  it("retrouve la proposition d'un joueur, quelle que soit sa connexion", () => {
    expect(proposalOfPlayer([proposal], "boris")?.id).toBe("p1");
    expect(proposalOfPlayer([proposal], "carla")).toBeUndefined();
  });
});

describe("requeueFront", () => {
  it("remet en tête, sans doublon du même joueur", () => {
    expect(requeueFront([carla, { ...anne, connectionId: "autre" }], [anne])).toEqual([anne, carla]);
  });
});
