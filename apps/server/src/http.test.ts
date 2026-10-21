import { describe, expect, it } from "vitest";
import { readBody } from "./http.js";

const post = (body: string) => new Request("https://occulis.test/", { method: "POST", body });

describe("readBody", () => {
  it("rend l'objet envoyé", async () => {
    expect(await readBody(post('{"handle":"anne"}'))).toEqual({ handle: "anne" });
  });

  it("rend un objet vide pour tout ce qui n'en est pas un", async () => {
    for (const body of ["", "pas du JSON", "null", "[1,2]", "42", '"texte"']) {
      expect(await readBody(post(body))).toEqual({});
    }
  });
});
