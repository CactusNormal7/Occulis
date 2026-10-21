import { describe, expect, it } from "vitest";
import { FRESH_MS, LoadCache, PendingCount, type Outcome, loadedOf, resource } from "./cache.js";

/** Une ressource dont on tient la réponse en main, et qui compte ses lectures. */
function controlled<T>(key = "k") {
  const answers: ((outcome: Outcome<T>) => void)[] = [];
  const res = resource<T>(key, () => new Promise((resolve) => answers.push(resolve)));
  return {
    res,
    answer: (outcome: Outcome<T>, index = answers.length - 1) => answers[index]?.(outcome),
    calls: () => answers.length,
  };
}

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("LoadCache.request", () => {
  it("ne lance qu'une lecture pour des demandes concurrentes", async () => {
    const cache = new LoadCache();
    const { res, answer, calls } = controlled<number>();
    const first = cache.request(res);
    const second = cache.request(res);
    expect(second).toBe(first);
    expect(calls()).toBe(1);
    answer({ ok: true, value: 7 });
    expect(await first).toEqual({ ok: true, value: 7 });
    expect(cache.value("k")).toBe(7);
  });

  it("rend une réponse fraîche sans relire, et relit au-delà de FRESH_MS ou sur demande", async () => {
    let now = 1000;
    const cache = new LoadCache(new PendingCount(), () => now);
    const { res, answer, calls } = controlled<number>();
    void cache.request(res);
    answer({ ok: true, value: 1 });
    await tick();
    await tick();

    expect(await cache.request(res)).toEqual({ ok: true, value: 1 });
    expect(calls()).toBe(1);

    void cache.request(res, { force: true });
    expect(calls()).toBe(2);
    answer({ ok: true, value: 2 });
    await tick();
    await tick();

    now += FRESH_MS;
    void cache.request(res);
    expect(calls()).toBe(3);
  });

  it("garde la dernière valeur pendant une relecture, et la signale", async () => {
    const cache = new LoadCache();
    const { res, answer } = controlled<string>();
    void cache.request(res);
    answer({ ok: true, value: "a" });
    await tick();
    await tick();
    void cache.request(res, { force: true });
    const entry = cache.peek<string>("k");
    expect(entry?.outcome).toEqual({ ok: true, value: "a" });
    expect(loadedOf({ ...entry!, outcome: entry!.outcome! })).toEqual({
      state: "ready",
      value: "a",
      refreshing: true,
    });
  });

  it("tient un échec pour une réponse, que la vue affiche", async () => {
    const cache = new LoadCache();
    const { res, answer } = controlled<string>();
    const pending = cache.request(res);
    answer({ ok: false, message: "down" });
    expect(await pending).toEqual({ ok: false, message: "down" });
    const entry = cache.peek<string>("k");
    expect(loadedOf({ ...entry!, outcome: entry!.outcome! })).toEqual({
      state: "failed",
      message: "down",
    });
  });

  it("ne rejette jamais, même si la lecture lève", async () => {
    const cache = new LoadCache();
    const res = resource<number>("boom", () => Promise.reject(new Error("network")));
    expect(await cache.request(res)).toEqual({ ok: false, message: "Error: network" });
  });

  it("ne prévient personne au départ d'une clé jamais lue, mais à son arrivée", async () => {
    const cache = new LoadCache();
    const { res, answer } = controlled<number>();
    let notified = 0;
    cache.subscribe("k", () => notified++);
    const pending = cache.request(res);
    expect(notified).toBe(0);
    answer({ ok: true, value: 1 });
    await pending;
    expect(notified).toBe(1);
  });

  it("précharge plusieurs ressources à la fois", () => {
    const cache = new LoadCache();
    const a = controlled<number>("a");
    const b = controlled<number>("b");
    cache.preload([a.res, b.res]);
    expect([a.calls(), b.calls()]).toEqual([1, 1]);
  });
});

describe("LoadCache.set et invalidate", () => {
  it("fait d'une valeur obtenue autrement la référence", () => {
    const cache = new LoadCache();
    cache.set("presets", { presets: [] });
    expect(cache.value("presets")).toEqual({ presets: [] });
  });

  it("oublie par préfixe, ou tout", () => {
    const cache = new LoadCache();
    for (const key of ["friend:1", "friend:1:matches:0", "profile"]) cache.set(key, key);
    cache.invalidate("friend:1");
    expect(["friend:1", "friend:1:matches:0", "profile"].map((key) => cache.value(key))).toEqual([
      undefined,
      undefined,
      "profile",
    ]);
    cache.invalidate();
    expect(cache.value("profile")).toBeUndefined();
  });
});

describe("PendingCount", () => {
  it("compte les lectures concurrentes et prévient après coup, une fois par rafale", async () => {
    const pending = new PendingCount();
    const seen: number[] = [];
    pending.subscribe(() => seen.push(pending.value));
    const first = pending.begin();
    const second = pending.begin();
    expect(seen).toEqual([]);
    await tick();
    expect(seen).toEqual([2]);
    first();
    first();
    second();
    await tick();
    expect(seen).toEqual([2, 0]);
  });
});
