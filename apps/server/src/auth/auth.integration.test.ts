import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "./cookie.js";

/**
 * L'authentification dans workerd. PBKDF2 passe par WebCrypto et D1 par le vrai
 * moteur : ni l'un ni l'autre n'a de sens sous un mock.
 */
export function unique(prefix: string): string {
  // Court : un pseudo est limité à 32 caractères, un UUID entier le dépasserait.
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function post(path: string, body: unknown, cookie?: string): Promise<Response> {
  return SELF.fetch(`https://occulis.test${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: cookie === undefined ? {} : { Cookie: cookie },
  });
}

/** Rend le cookie de session, tel qu'un navigateur le renverrait. */
export function cookieFrom(response: Response): string {
  const header = response.headers.get("Set-Cookie");
  expect(header).not.toBeNull();
  const value = header?.split(";")[0] ?? "";
  expect(value.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
  return value;
}

export async function signUp(handle: string): Promise<string> {
  const response = await post("/api/auth/register", {
    email: `${handle}@occulis.test`,
    password: "un-mot-de-passe-assez-long",
    handle,
  });
  expect(response.status).toBe(200);
  return cookieFrom(response);
}

describe("authentification", () => {
  it("inscrit un compte, ouvre une session et la reconnaît", async () => {
    const handle = unique("anne");
    const cookie = await signUp(handle);

    const me = await SELF.fetch("https://occulis.test/api/auth/me", { headers: { Cookie: cookie } });
    expect(await me.json()).toEqual({ signedIn: true, handle });
  });

  it("ne reconnaît personne sans cookie", async () => {
    const me = await SELF.fetch("https://occulis.test/api/auth/me");
    expect(await me.json()).toEqual({ signedIn: false });
  });

  it("ne reconnaît pas un jeton inventé", async () => {
    const me = await SELF.fetch("https://occulis.test/api/auth/me", {
      headers: { Cookie: `${SESSION_COOKIE}=jeton-inexistant` },
    });
    expect(await me.json()).toEqual({ signedIn: false });
  });

  it("protège le cookie de session", async () => {
    const response = await post("/api/auth/register", {
      email: `${unique("boris")}@occulis.test`,
      password: "un-mot-de-passe-assez-long",
      handle: unique("boris"),
    });
    const header = response.headers.get("Set-Cookie") ?? "";

    // Aucun des trois n'est optionnel : le jeton vaut un mot de passe tant qu'il vit.
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
  });

  it("reconnecte avec le bon mot de passe et refuse le mauvais", async () => {
    const handle = unique("carla");
    await signUp(handle);
    const email = `${handle}@occulis.test`;

    const good = await post("/api/auth/login", { email, password: "un-mot-de-passe-assez-long" });
    expect(good.status).toBe(200);

    const bad = await post("/api/auth/login", { email, password: "un-mot-de-passe-different" });
    expect(bad.status).toBe(401);
  });

  it("répond la même chose à une adresse inconnue qu'à un mot de passe faux", async () => {
    // Distinguer les deux dirait à un inconnu quelles adresses sont inscrites.
    const handle = unique("dario");
    await signUp(handle);

    const wrongPassword = await post("/api/auth/login", {
      email: `${handle}@occulis.test`,
      password: "pas-le-bon-du-tout",
    });
    const unknownEmail = await post("/api/auth/login", {
      email: `${unique("personne")}@occulis.test`,
      password: "pas-le-bon-du-tout",
    });

    expect(wrongPassword.status).toBe(unknownEmail.status);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
  });

  it("refuse une adresse ou un pseudo déjà pris", async () => {
    const handle = unique("elia");
    await signUp(handle);

    const sameEmail = await post("/api/auth/register", {
      email: `${handle}@occulis.test`,
      password: "un-mot-de-passe-assez-long",
      handle: unique("elia-bis"),
    });
    expect(sameEmail.status).toBe(409);

    const sameHandle = await post("/api/auth/register", {
      email: `${unique("elia-ter")}@occulis.test`,
      password: "un-mot-de-passe-assez-long",
      handle,
    });
    expect(sameHandle.status).toBe(409);
  });

  it("refuse un mot de passe trop court et une adresse malformée", async () => {
    const short = await post("/api/auth/register", {
      email: `${unique("faya")}@occulis.test`,
      password: "court",
      handle: unique("faya"),
    });
    expect(short.status).toBe(409);

    const malformed = await post("/api/auth/register", {
      email: "pas-une-adresse",
      password: "un-mot-de-passe-assez-long",
      handle: unique("gaby"),
    });
    expect(malformed.status).toBe(409);
  });

  it("ferme la session à la déconnexion", async () => {
    const cookie = await signUp(unique("hugo"));
    const out = await post("/api/auth/logout", {}, cookie);
    expect(out.status).toBe(204);

    const me = await SELF.fetch("https://occulis.test/api/auth/me", { headers: { Cookie: cookie } });
    expect(await me.json()).toEqual({ signedIn: false });
  });
});
