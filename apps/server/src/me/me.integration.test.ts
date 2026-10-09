import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { MeMatchDetail, MeMatchPage, MeProfile, MeSession } from "@occulis/protocol";
import { PASSWORD, cookieFrom, post, signUp, unique } from "../test-helpers.js";

/**
 * La page de profil dans workerd. Ce qu'on éprouve d'abord, c'est le cloisonnement :
 * chaque route agit sur le compte de la session et sur rien d'autre, quoi que dise
 * l'URL, et une session d'emprunt n'y change rien.
 */

let addresses = 0;

function nextAddress(): string {
  addresses += 1;
  return `10.251.${addresses >> 8}.${addresses & 255}`;
}

async function get(path: string, cookie?: string): Promise<Response> {
  const headers: Record<string, string> = { "CF-Connecting-IP": nextAddress() };
  if (cookie !== undefined) headers["Cookie"] = cookie;
  return SELF.fetch(`https://occulis.test${path}`, { headers, redirect: "manual" });
}

async function profile(cookie: string): Promise<MeProfile> {
  return (await (await get("/api/me", cookie)).json()) as MeProfile;
}

async function idsOf(handle: string): Promise<{ id: string; player_id: string }> {
  const row = await env.DB.prepare("SELECT id, player_id FROM users WHERE email = ?")
    .bind(`${handle}@occulis.test`)
    .first<{ id: string; player_id: string }>();
  if (row === null) throw new Error(`compte introuvable : ${handle}`);
  return row;
}

async function signIn(handle: string): Promise<string> {
  return cookieFrom(await post("/api/auth/sign-in/email", { email: `${handle}@occulis.test`, password: PASSWORD }));
}

/** Remplace le cookie de session par celui qu'une réponse pose, comme un navigateur. */
function jar(previous: string, response: Response): string {
  const header = response.headers.get("Set-Cookie") ?? "";
  const fresh = header.match(/__Secure-occulis\.session_token=[^;]+/)?.[0];
  return fresh ?? previous;
}

describe("profil : identité", () => {
  it("refuse un visiteur sans session", async () => {
    expect((await get("/api/me")).status).toBe(401);
    expect((await get("/api/me/sessions")).status).toBe(401);
    expect((await get("/api/me/matches")).status).toBe(401);
  });

  it("rend le profil du compte de la session", async () => {
    const handle = unique("pauline");
    const cookie = await signUp(handle);
    const me = await profile(cookie);
    expect(me).toMatchObject({
      handle,
      email: `${handle}@occulis.test`,
      emailVerified: true,
      nextHandleChangeAt: null,
      hasPassword: true,
      providers: [],
      availableProviders: [],
      impersonating: false,
      record: { played: 0, won: 0, lost: 0, ongoing: 0 },
    });
    expect(me.createdAt).toBeGreaterThan(0);
  });

  it("change le pseudo dans les deux tables, puis impose le délai", async () => {
    const handle = unique("quentin");
    const cookie = await signUp(handle);
    const renamed = unique("quentin2");

    const changed = await post("/api/me/handle", { handle: renamed }, cookie);
    expect(changed.status).toBe(200);
    const { player_id } = await idsOf(handle);
    const rows = await env.DB.prepare(
      "SELECT players.handle AS p, users.name AS u FROM players JOIN users ON users.player_id = players.id WHERE players.id = ?",
    )
      .bind(player_id)
      .first<{ p: string; u: string }>();
    expect(rows).toEqual({ p: renamed, u: renamed });
    expect((await profile(cookie)).nextHandleChangeAt).toBeGreaterThan(Date.now());

    const again = await post("/api/me/handle", { handle: unique("quentin3") }, cookie);
    expect(again.status).toBe(429);
    expect(await again.json()).toEqual({ code: "HANDLE_COOLDOWN" });
  });

  it("refuse un pseudo pris, à la casse près, ou invalide", async () => {
    const taken = unique("rose");
    await signUp(taken);
    const cookie = await signUp(unique("rose"));

    const clash = await post("/api/me/handle", { handle: taken.toUpperCase() }, cookie);
    expect(clash.status).toBe(422);
    expect(await clash.json()).toEqual({ code: "HANDLE_TAKEN" });

    const reserved = await post("/api/me/handle", { handle: "Admin" }, cookie);
    expect(await reserved.json()).toEqual({ code: "HANDLE_RESERVED" });
    const invisible = await post("/api/me/handle", { handle: "ab‮cd" }, cookie);
    expect(await invisible.json()).toEqual({ code: "HANDLE_CHARSET" });
  });

  it("refuse une écriture venue d'une autre origine", async () => {
    const cookie = await signUp(unique("samir"));
    const response = await SELF.fetch("https://occulis.test/api/me/handle", {
      method: "POST",
      headers: { Cookie: cookie, Origin: "https://evil.test", "Content-Type": "application/json" },
      body: JSON.stringify({ handle: unique("vole") }),
    });
    expect(response.status).toBe(403);
  });
});

describe("profil : inscription", () => {
  it("refuse à l'inscription un pseudo réservé ou pris à la casse près", async () => {
    const reserved = await post("/api/auth/sign-up/email", {
      email: `${unique("tom")}@occulis.test`,
      password: PASSWORD,
      name: "Modérateur",
    });
    expect(reserved.status).toBe(400);
    expect(((await reserved.json()) as { code: string }).code).toBe("HANDLE_RESERVED");

    const taken = unique("ugo");
    await signUp(taken);
    const clash = await post("/api/auth/sign-up/email", {
      email: `${unique("ugo")}@occulis.test`,
      password: PASSWORD,
      name: taken.toUpperCase(),
    });
    expect(clash.status).toBe(422);
  });

  it("enregistre le pseudo normalisé dans les deux tables", async () => {
    const handle = unique("vera");
    const response = await post("/api/auth/sign-up/email", {
      email: `${handle}@occulis.test`,
      password: PASSWORD,
      name: `  ${handle}  `,
    });
    expect(response.status).toBe(200);
    const row = await env.DB.prepare(
      "SELECT users.name AS u, players.handle AS p FROM users JOIN players ON players.id = users.player_id WHERE users.email = ?",
    )
      .bind(`${handle}@occulis.test`)
      .first<{ u: string; p: string }>();
    expect(row).toEqual({ u: handle, p: handle });
  });
});

describe("profil : sessions", () => {
  it("liste les sessions sans jamais rendre de jeton", async () => {
    const handle = unique("wanda");
    const first = await signUp(handle);
    await signIn(handle);

    const sessions = (await (await get("/api/me/sessions", first)).json()) as MeSession[];
    expect(sessions).toHaveLength(2);
    expect(sessions.filter((session) => session.current)).toHaveLength(1);
    expect(JSON.stringify(sessions)).not.toMatch(/token/i);
  });

  it("révoque une session à soi, et seulement à soi", async () => {
    const handle = unique("xavier");
    const mine = await signUp(handle);
    const other = await signIn(handle);
    const stranger = await signUp(unique("yann"));

    const sessions = (await (await get("/api/me/sessions", mine)).json()) as MeSession[];
    const target = sessions.find((session) => !session.current);
    expect(target).toBeDefined();

    // Un autre compte ne peut pas la fermer, même en connaissant son identifiant.
    expect((await post(`/api/me/sessions/${target?.id ?? ""}/revoke`, {}, stranger)).status).toBe(404);
    expect((await get("/api/me", other)).status).toBe(200);

    expect((await post(`/api/me/sessions/${target?.id ?? ""}/revoke`, {}, mine)).status).toBe(200);
    expect((await get("/api/me", other)).status).toBe(401);
    expect((await get("/api/me", mine)).status).toBe(200);
  });

  it("ferme toutes les autres sessions d'un geste", async () => {
    const handle = unique("zoe");
    const mine = await signUp(handle);
    const a = await signIn(handle);
    const b = await signIn(handle);

    expect(await (await post("/api/me/sessions/revoke-others", {}, mine)).json()).toEqual({ revoked: 2 });
    expect((await get("/api/me", a)).status).toBe(401);
    expect((await get("/api/me", b)).status).toBe(401);
    expect((await get("/api/me", mine)).status).toBe(200);
  });

  it("ferme les autres sessions à chaque changement de mot de passe, même sans le demander", async () => {
    const handle = unique("adam");
    const mine = await signUp(handle);
    const other = await signIn(handle);

    const changed = await post(
      "/api/auth/change-password",
      { currentPassword: PASSWORD, newPassword: "un-nouveau-mot-de-passe", revokeOtherSessions: false },
      mine,
    );
    expect(changed.status).toBe(200);
    expect((await get("/api/me", other)).status).toBe(401);
    expect((await get("/api/me", jar(mine, changed))).status).toBe(200);
  });
});

describe("profil : parties", () => {
  async function matchBetween(a: string, b: string): Promise<string> {
    const response = await SELF.fetch("https://occulis.test/api/matches", {
      method: "POST",
      body: JSON.stringify({ playerA: a, playerB: b }),
    });
    return ((await response.json()) as { matchId: string }).matchId;
  }

  it("ne liste que ses parties, et ne rejoue qu'une partie finie, vue de son camp", async () => {
    const meHandle = unique("blaise");
    const cookie = await signUp(meHandle);
    const opponentHandle = unique("chloe");
    const opponentCookie = await signUp(opponentHandle);
    const stranger = await signUp(unique("denis"));
    const me = (await idsOf(meHandle)).player_id;
    const opponent = (await idsOf(opponentHandle)).player_id;

    const matchId = await matchBetween(opponent, me);

    const page = (await (await get("/api/me/matches", cookie)).json()) as MeMatchPage;
    expect(page.total).toBe(1);
    expect(page.matches[0]).toMatchObject({ id: matchId, seat: "B", opponent: opponentHandle, result: "ongoing" });

    // En cours : refusée au joueur lui-même, introuvable pour un tiers.
    expect((await get(`/api/me/matches/${matchId}`, cookie)).status).toBe(409);
    expect((await get(`/api/me/matches/${matchId}`, stranger)).status).toBe(404);

    await env.DB.batch([
      env.DB.prepare("INSERT INTO match_actions (match_id, seq, action) VALUES (?, 0, ?)").bind(
        matchId,
        JSON.stringify({ kind: "resign" }),
      ),
      env.DB.prepare("UPDATE matches SET finished_at = ?, outcome = ? WHERE id = ?").bind(
        Date.now(),
        JSON.stringify({ kind: "victory", winner: "B", reason: "resignation" }),
        matchId,
      ),
    ]);

    expect((await get(`/api/me/matches/${matchId}`, stranger)).status).toBe(404);
    const detail = (await (await get(`/api/me/matches/${matchId}`, cookie)).json()) as MeMatchDetail;
    expect(detail.result).toBe("won");
    expect(detail.replayError).toBeNull();
    expect(detail.frames).toHaveLength(2);
    // Le fog s'applique au replay : une pièce adverse n'apparaît que sur une case vue.
    for (const frame of detail.frames) {
      for (const piece of frame.pieces) {
        if (piece.owner !== "B") expect(frame.visible).toContain(`${piece.x},${piece.y}`);
      }
    }
    expect(JSON.stringify(detail)).not.toContain('"visible":{');

    const theirs = (await (await get(`/api/me/matches/${matchId}`, opponentCookie)).json()) as MeMatchDetail;
    expect(theirs.seat).toBe("A");
    expect(theirs.result).toBe("lost");
    expect((await profile(cookie)).record).toEqual({ played: 1, won: 1, lost: 0, ongoing: 0 });
  });
});

describe("profil : usurpation", () => {
  async function impersonate(): Promise<{ cookie: string; target: string }> {
    const admin = unique("chef");
    await signUp(admin);
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE email = ?").bind(`${admin}@occulis.test`).run();
    let cookie = await signIn(admin);
    const target = unique("cible");
    await signUp(target);
    const { id } = await idsOf(target);
    const started = await post("/api/auth/admin/impersonate-user", { userId: id }, cookie);
    expect(started.status).toBe(200);
    cookie = jar(cookie, started);
    return { cookie, target };
  }

  it("laisse voir le profil, mais refuse toute modification du compte", async () => {
    const { cookie, target } = await impersonate();
    const seen = await profile(cookie);
    expect(seen).toMatchObject({ handle: target, impersonating: true });

    const attempts: [string, unknown][] = [
      ["/api/me/handle", { handle: unique("detourne") }],
      ["/api/me/sessions/revoke-others", {}],
      ["/api/auth/change-password", { currentPassword: PASSWORD, newPassword: "un-mot-de-passe-pirate" }],
      ["/api/auth/change-email", { newEmail: `${unique("pirate")}@occulis.test` }],
      ["/api/auth/delete-user", {}],
      ["/api/auth/unlink-account", { providerId: "google" }],
      ["/api/auth/revoke-other-sessions", {}],
    ];
    for (const [path, body] of attempts) {
      const response = await post(path, body, cookie);
      expect([path, response.status]).toEqual([path, 403]);
    }

    const name = await env.DB.prepare("SELECT name FROM users WHERE email = ?")
      .bind(`${target}@occulis.test`)
      .first<{ name: string }>();
    expect(name?.name).toBe(target);
  });
});

describe("profil : suppression du compte", () => {
  it("supprime le compte par le lien reçu, et anonymise le profil", async () => {
    const handle = unique("emile");
    const cookie = await signUp(handle);
    const { id, player_id } = await idsOf(handle);

    const asked = await post("/api/auth/delete-user", { callbackURL: "/" }, cookie);
    expect(asked.status).toBe(200);
    // Rien n'est supprimé tant que le lien n'a pas été ouvert.
    expect(await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(id).first()).not.toBeNull();

    const stored = await env.DB.prepare(
      "SELECT identifier FROM verifications WHERE value = ? AND identifier LIKE 'delete-account-%'",
    )
      .bind(id)
      .first<{ identifier: string }>();
    const token = (stored?.identifier ?? "").replace("delete-account-", "");
    expect(token.length).toBeGreaterThan(0);

    const confirmed = await get(`/api/auth/delete-user/callback?token=${token}&callbackURL=/`, cookie);
    expect(confirmed.status).toBe(302);

    expect(await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(id).first()).toBeNull();
    const player = await env.DB.prepare("SELECT handle FROM players WHERE id = ?").bind(player_id).first<{ handle: string }>();
    expect(player?.handle.startsWith("supprimé-")).toBe(true);
    expect(player?.handle).not.toContain(handle);
  });
});

describe("authentification : bornes", () => {
  it("limite les demandes de réinitialisation depuis une même adresse", async () => {
    const handle = unique("fanny");
    await signUp(handle);
    const ip = "203.0.113.42";
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await post(
        "/api/auth/request-password-reset",
        { email: `${handle}@occulis.test`, redirectTo: "/reinitialiser" },
        undefined,
        ip,
      );
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses).toContain(429);
  });

  it("renvoie les gestionnaires de mots de passe vers le profil", async () => {
    const response = await get("/.well-known/change-password");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://occulis.test/profil/#securite");
  });
});
