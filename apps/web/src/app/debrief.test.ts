import { describe, expect, it } from "vitest";
import type { MeMatchDebrief } from "@occulis/protocol";
import type { Outcome } from "../load/cache.js";
import type { FlowEvent } from "../ui/flow.js";
import { Debrief, debriefFromPath, debriefPath } from "./debrief.js";

function harness() {
  const reads: ((outcome: Outcome<MeMatchDebrief>) => void)[] = [];
  const left: string[] = [];
  const paths: string[] = [];
  const events: FlowEvent[] = [];
  let islands = 0;
  const debrief = new Debrief({
    load: () => new Promise((resolve) => void reads.push(resolve)),
    leave: (matchId) => void left.push(matchId),
    go: (event) => void events.push(event),
    setPath: (path) => void paths.push(path),
    showIslands: () => void (islands += 1),
  });
  const answer = (outcome: Outcome<MeMatchDebrief>) => reads.shift()!(outcome);
  return { debrief, left, paths, events, answer, islands: () => islands };
}

const READ: Outcome<MeMatchDebrief> = { ok: true, value: {} as MeMatchDebrief };

describe("Debrief", () => {
  it("lit le lien de l'écran de fin, et rien d'autre", () => {
    expect(debriefFromPath(debriefPath("m-1"))).toBe("m-1");
    expect(debriefFromPath("/debrief/")).toBeUndefined();
    expect(debriefFromPath("/debrief/m1/x")).toBeUndefined();
    expect(debriefFromPath("/sign-in")).toBeUndefined();
  });

  it("ne paraît qu'une fois sa lecture arrivée, sous son lien", async () => {
    const { debrief, paths, events, answer } = harness();

    const opening = debrief.open("m1");
    expect(events).toEqual([]);
    answer(READ);

    expect(await opening).toEqual({ kind: "opened" });
    expect(debrief.matchId).toBe("m1");
    expect(paths).toEqual(["/debrief/m1"]);
    expect(events).toEqual([{ kind: "debrief", matchId: "m1" }]);
  });

  it("rend le refus du serveur et remet l'adresse à la racine", async () => {
    const { debrief, paths, events, answer } = harness();

    const opening = debrief.open("m1");
    answer({ ok: false, message: "fermé" });

    expect(await opening).toEqual({ kind: "refused", message: "fermé" });
    expect(debrief.matchId).toBeUndefined();
    expect(paths).toEqual(["/"]);
    expect(events).toEqual([]);
  });

  it("ne redemande pas un écran déjà demandé", async () => {
    const { debrief, answer } = harness();

    const first = debrief.open("m1");
    expect(await debrief.open("m1")).toEqual({ kind: "stale" });
    answer(READ);
    await first;

    expect(await debrief.open("m1")).toEqual({ kind: "stale" });
  });

  it("oublie une lecture que le joueur a devancée en partant", async () => {
    const { debrief, events, left, answer } = harness();

    const opening = debrief.open("m1");
    debrief.close();
    answer(READ);

    expect(await opening).toEqual({ kind: "stale" });
    expect(events).toEqual([]);
    // Jamais montré : rien à quitter.
    expect(left).toEqual([]);
  });

  it("dit son départ au serveur une seule fois, et rend l'adresse", async () => {
    const { debrief, left, paths, answer } = harness();
    const opening = debrief.open("m1");
    answer(READ);
    await opening;

    debrief.close();
    debrief.close();

    expect(left).toEqual(["m1"]);
    expect(paths).toEqual(["/debrief/m1", "/"]);
    expect(debrief.matchId).toBeUndefined();
  });
});
