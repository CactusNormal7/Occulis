import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonInit, request } from "./http.js";

const wording = {
  unreachable: () => "injoignable",
  describe: (status: number, payload: { code?: string }) =>
    `refus ${status} ${payload.code ?? "-"}`,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("rend la valeur d'une réponse réussie", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ a: 1 }), { status: 200 }));
    expect(await request<{ a: number }>("/x", undefined, wording)).toEqual({
      ok: true,
      value: { a: 1 },
    });
  });

  it("met un refus en mots, code du serveur compris", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response(JSON.stringify({ code: "NOPE" }), { status: 409 }),
    );
    expect(await request("/x", undefined, wording)).toEqual({
      ok: false,
      message: "refus 409 NOPE",
    });
  });

  it("supporte une réponse sans corps JSON", async () => {
    vi.stubGlobal("fetch", async () => new Response("pas du JSON", { status: 500 }));
    expect(await request("/x", undefined, wording)).toEqual({ ok: false, message: "refus 500 -" });
  });

  it("ne rejette jamais, même sans réseau", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("offline");
    });
    expect(await request("/x", undefined, wording)).toEqual({ ok: false, message: "injoignable" });
  });
});

describe("jsonInit", () => {
  it("sérialise le corps, et n'en joint aucun sans", () => {
    expect(jsonInit("POST", { b: 2 })).toEqual({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"b":2}',
    });
    expect(jsonInit("DELETE").body).toBeNull();
  });
});
