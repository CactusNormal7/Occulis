import { describe, expect, it } from "vitest";
import {
  breachedPassword,
  MIN_PASSWORD_LENGTH,
  PBKDF2_PARAMETERS,
  hashPassword,
  verifyPassword,
} from "./password.js";

const PASSWORD = "un-mot-de-passe-correct";

describe("plafond PBKDF2 du runtime Workers", () => {
  /**
   * Le garde-fou central de ce module, et la raison pour laquelle il existe.
   *
   * La bordure Cloudflare refuse `deriveBits` au-delà de cent mille itérations
   * (`NotSupportedError: Pbkdf2 failed…`, cloudflare/workerd#1346), mais **le workerd
   * local, celui-là même qui exécute ce test, n'applique aucun plafond**. Aucune
   * exécution ici ne peut donc reproduire l'échec : le projet a été déployé avec
   * 210 000 itérations, suite verte, et l'authentification échouait en 500 sur chaque
   * inscription et chaque connexion en recette.
   *
   * Faute de pouvoir éprouver le comportement, on verrouille la valeur.
   */
  it("ne dépasse jamais ce que la bordure accepte, par passe", () => {
    expect(PBKDF2_PARAMETERS.iterationsPerPass).toBeLessThanOrEqual(
      PBKDF2_PARAMETERS.maxIterationsPerPass,
    );
  });

  it("atteint malgré tout le coût recommandé par l'OWASP, en enchaînant", () => {
    const effective = PBKDF2_PARAMETERS.iterationsPerPass * PBKDF2_PARAMETERS.passes;
    expect(effective).toBeGreaterThanOrEqual(600_000);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("reconnaît le bon mot de passe et rejette les autres", async () => {
    const stored = await hashPassword(PASSWORD);

    expect(await verifyPassword(PASSWORD, stored)).toBe(true);
    expect(await verifyPassword("un-mot-de-passe-faux", stored)).toBe(false);
  });

  it("sale chaque empreinte, donc deux fois le même mot de passe diffèrent", async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD));
  });

  it("inscrit son paramétrage dans l'empreinte", async () => {
    const [scheme, cost] = (await hashPassword(PASSWORD)).split("$");

    expect(scheme).toBe("pbkdf2-sha256");
    expect(cost).toBe(`${PBKDF2_PARAMETERS.passes}x${PBKDF2_PARAMETERS.iterationsPerPass}`);
  });

  it("lit encore une empreinte d'avant le chaînage, à passe unique", async () => {
    // Forme historique `pbkdf2-sha256$<itérations>$…`. Aucune n'existe sur un
    // environnement déployé, mais les bases de développement local en portent.
    const salt = new Uint8Array(16).fill(7);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(PASSWORD),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 50_000, hash: "SHA-256" },
      key,
      256,
    );
    const base64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
    const legacy = `pbkdf2-sha256$50000$${base64(salt)}$${base64(new Uint8Array(bits))}`;

    expect(await verifyPassword(PASSWORD, legacy)).toBe(true);
    expect(await verifyPassword("autre-chose", legacy)).toBe(false);
  });

  it("rejette une empreinte illisible plutôt que de lever", async () => {
    for (const malformed of ["", "n'importe quoi", "scrypt$1$a$b", "pbkdf2-sha256$0x100$a$b"]) {
      expect(await verifyPassword(PASSWORD, malformed)).toBe(false);
    }
  });

  it("exige un mot de passe d'au moins dix caractères", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
  });
});

describe("mots de passe ayant fuité", () => {
  // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
  const range = (body: string, status = 200): typeof fetch =>
    (async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("https://api.pwnedpasswords.com/range/5BAA6");
      return new Response(body, { status });
    }) as typeof fetch;

  it("n'envoie que le préfixe et reconnaît le suffixe", async () => {
    expect(await breachedPassword("password", range("0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824"))).toBe(true);
  });

  it("ignore les leurres à compte nul", async () => {
    expect(await breachedPassword("password", range("1E4C9B93F3F0682250B6CF8331B7EE68FD8:0"))).toBe(false);
  });

  it("rend faux quand le suffixe est absent", async () => {
    expect(await breachedPassword("password", range("0018A45C4D1DEF81644B54AB7F969B88D65:3"))).toBe(false);
  });

  it("ne tranche pas quand le service est indisponible", async () => {
    expect(await breachedPassword("password", range("", 503))).toBeUndefined();
    const failing = (async () => {
      throw new Error("réseau");
    }) as typeof fetch;
    expect(await breachedPassword("password", failing)).toBeUndefined();
  });
});
