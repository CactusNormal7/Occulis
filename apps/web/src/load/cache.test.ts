import { describe, expect, it } from "vitest";
import { LoadCache, PendingCount, refreshing } from "./cache.js";

describe("LoadCache", () => {
  it("attend à vide une ressource jamais lue", () => {
    expect(new LoadCache().initial("profile")).toEqual({ state: "loading" });
  });

  it("montre aussitôt une ressource déjà lue, en signalant sa relecture", () => {
    const cache = new LoadCache();
    expect(cache.settle("matches:0", { ok: true, value: [1, 2] })).toEqual({
      state: "ready",
      value: [1, 2],
      refreshing: false,
    });
    expect(cache.initial("matches:0")).toEqual({ state: "ready", value: [1, 2], refreshing: true });
  });

  it("garde en cache une valeur falsy", () => {
    const cache = new LoadCache();
    cache.settle("count", { ok: true, value: 0 });
    expect(cache.initial("count")).toEqual({ state: "ready", value: 0, refreshing: true });
  });

  it("n'écrit pas un échec, et ne perd pas pour autant la dernière valeur", () => {
    const cache = new LoadCache();
    cache.settle("feats", { ok: true, value: "a" });
    expect(cache.settle("feats", { ok: false, message: "down" })).toEqual({
      state: "failed",
      message: "down",
    });
    expect(cache.get("feats")).toBe("a");
  });

  it("oublie par préfixe, ou tout", () => {
    const cache = new LoadCache();
    for (const key of ["friend:1", "friend:1:matches:0", "profile"]) cache.set(key, key);
    cache.invalidate("friend:1");
    expect([cache.has("friend:1"), cache.has("friend:1:matches:0"), cache.has("profile")]).toEqual([
      false,
      false,
      true,
    ]);
    cache.invalidate();
    expect(cache.has("profile")).toBe(false);
  });
});

describe("refreshing", () => {
  it("garde la valeur affichée pendant une relecture, laisse le reste tel quel", () => {
    expect(refreshing({ state: "ready", value: 1, refreshing: false })).toEqual({
      state: "ready",
      value: 1,
      refreshing: true,
    });
    expect(refreshing({ state: "loading" })).toEqual({ state: "loading" });
    expect(refreshing({ state: "failed", message: "x" })).toEqual({
      state: "failed",
      message: "x",
    });
  });
});

describe("PendingCount", () => {
  it("compte les lectures concurrentes et prévient à chaque changement", () => {
    const pending = new PendingCount();
    const seen: number[] = [];
    pending.subscribe(() => seen.push(pending.value));
    const first = pending.begin();
    const second = pending.begin();
    first();
    first();
    second();
    expect(seen).toEqual([1, 2, 1, 0]);
  });
});
