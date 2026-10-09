import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { AdminMatchDetail, AdminMatchPage, AdminPlayer, AdminStats } from "@occulis/protocol";
import { PASSWORD, cookieFrom, post, signUp, unique } from "../test-helpers.js";

/**
 * Le back-office dans workerd. Le contrôle de rôle est la seule chose qui sépare ces
 * routes d'un accès en lecture à toute la base : c'est lui qu'on éprouve d'abord, sur
 * les routes du projet comme sur celles du greffon.
 */

let addresses = 0;

async function get(path: string, cookie?: string): Promise<Response> {
  // Une adresse par appel, pour la même raison que `post` : sans elle, la limitation
  // de débit retomberait sur un seau partagé et la suite se limiterait elle-même.
  addresses += 1;
  const headers: Record<string, string> = { "CF-Connecting-IP": `10.250.${addresses >> 8}.${addresses & 255}` };
  if (cookie !== undefined) headers["Cookie"] = cookie;
  return SELF.fetch(`https://occulis.test${path}`, { headers });
}

/** Le rôle se pose à la main, comme pour le premier administrateur d'un environnement. */
async function signUpAdmin(handle: string): Promise<string> {
  await signUp(handle);
  await env.DB.prepare("UPDATE users SET role = 'admin' WHERE email = ?")
    .bind(`${handle}@occulis.test`)
    .run();
  // La session de l'inscription porte une copie du compte d'avant la promotion : on en
  // ouvre une neuve, qui lit le rôle à jour.
  return cookieFrom(
    await post("/api/auth/sign-in/email", { email: `${handle}@occulis.test`, password: PASSWORD }),
  );
}

async function userIdOf(handle: string): Promise<{ id: string; player_id: string }> {
  const row = await env.DB.prepare("SELECT id, player_id FROM users WHERE name = ?")
    .bind(handle)
    .first<{ id: string; player_id: string }>();
  if (row === null) throw new Error(`compte introuvable : ${handle}`);
  return row;
}

async function startMatch(playerA: string, playerB: string): Promise<string> {
  const response = await SELF.fetch("https://occulis.test/api/matches", {
    method: "POST",
    body: JSON.stringify({ playerA, playerB }),
  });
  return ((await response.json()) as { matchId: string }).matchId;
}

describe("back-office : contrôle d'accès", () => {
  it("refuse un visiteur anonyme et un joueur ordinaire", async () => {
    expect((await get("/api/admin/stats")).status).toBe(401);

    const cookie = await signUp(unique("ordinaire"));
    expect((await get("/api/admin/stats", cookie)).status).toBe(403);
    expect((await get("/api/admin/matches", cookie)).status).toBe(403);
    // Les routes du greffon portent leur propre contrôle, indépendant du nôtre.
    expect((await get("/api/auth/admin/list-users", cookie)).status).toBe(403);
  });

  it("signale l'administrateur à `/api/auth/me`", async () => {
    const handle = unique("chef");
    const cookie = await signUpAdmin(handle);
    const me = await (await get("/api/auth/me", cookie)).json();
    expect(me).toEqual({
      signedIn: true,
      handle,
      email: `${handle}@occulis.test`,
      emailVerified: true,
      admin: true,
      impersonating: false,
      providers: [],
    });
  });

  it("refuse une écriture venue d'une autre origine", async () => {
    const cookie = await signUpAdmin(unique("chef"));
    const { player_id } = await userIdOf((await (await get("/api/auth/me", cookie)).json() as { handle: string }).handle);
    const response = await SELF.fetch(`https://occulis.test/api/admin/players/${player_id}/handle`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: "https://ailleurs.test", "Content-Type": "application/json" },
      body: JSON.stringify({ handle: "pirate" }),
    });
    expect(response.status).toBe(403);
  });
});

describe("back-office : comptes, par le greffon Better Auth", () => {
  it("liste les comptes avec leur rôle et leur profil", async () => {
    const cookie = await signUpAdmin(unique("chef"));
    const target = unique("cible");
    await signUp(target);

    const response = await get(
      `/api/auth/admin/list-users?searchField=name&searchValue=${target}`,
      cookie,
    );
    expect(response.status).toBe(200);
    const { users } = (await response.json()) as {
      users: { name: string; role: string; playerId: string; banned: boolean }[];
    };
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ name: target, role: "user", banned: false });
    expect(users[0]?.playerId).toBe((await userIdOf(target)).player_id);
  });

  it("bannit un compte : la connexion et la file lui sont fermées", async () => {
    const cookie = await signUpAdmin(unique("chef"));
    const target = unique("banni");
    const targetCookie = await signUp(target);
    const { id } = await userIdOf(target);

    const banned = await post("/api/auth/admin/ban-user", { userId: id, banReason: "triche" }, cookie);
    expect(banned.status).toBe(200);

    // Le bannissement révoque les sessions ouvertes…
    expect(await (await get("/api/auth/me", targetCookie)).json()).toEqual({ signedIn: false, providers: [] });
    // … et refuse d'en ouvrir une neuve.
    const signIn = await post("/api/auth/sign-in/email", {
      email: `${target}@occulis.test`,
      password: PASSWORD,
    });
    expect(signIn.ok).toBe(false);

    await post("/api/auth/admin/unban-user", { userId: id }, cookie);
    const again = await post("/api/auth/sign-in/email", {
      email: `${target}@occulis.test`,
      password: PASSWORD,
    });
    expect(again.status).toBe(200);
  });

  it("refuse de renommer par les routes de Better Auth, qui n'écriraient qu'une table", async () => {
    const cookie = await signUpAdmin(unique("chef"));
    const target = unique("cible");
    const targetCookie = await signUp(target);
    const { id } = await userIdOf(target);

    const byAdmin = await post("/api/auth/admin/update-user", { userId: id, data: { name: "x-nouveau" } }, cookie);
    expect(byAdmin.status).toBe(400);
    const bySelf = await post("/api/auth/update-user", { name: "y-nouveau" }, targetCookie);
    expect(bySelf.status).toBe(400);

    // Les autres champs passent toujours.
    const verified = await post(
      "/api/auth/admin/update-user",
      { userId: id, data: { emailVerified: false } },
      cookie,
    );
    expect(verified.status).toBe(200);
  });
});

/**
 * Recompose l'en-tête `Cookie` qu'un navigateur renverrait après `response` : les
 * cookies posés remplacent les anciens du même nom, ceux qu'on expire disparaissent.
 * L'usurpation en pose et en retire plusieurs à la fois, ce que `cookieFrom` ne sait pas
 * suivre.
 */
function jar(previous: string, response: Response): string {
  const cookies = new Map(
    previous
      .split("; ")
      .filter((entry) => entry.includes("="))
      .map((entry) => [entry.slice(0, entry.indexOf("=")), entry.slice(entry.indexOf("=") + 1)] as const),
  );
  for (const header of response.headers.getSetCookie()) {
    const [pair = ""] = header.split(";");
    const name = pair.slice(0, pair.indexOf("="));
    const value = pair.slice(pair.indexOf("=") + 1);
    if (value.length === 0 || /max-age=0/i.test(header)) cookies.delete(name);
    else cookies.set(name, value);
  }
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

describe("back-office : usurpation", () => {
  it("ouvre une session au nom du joueur, la signale, puis rend la sienne à l'administrateur", async () => {
    const admin = unique("chef");
    let cookie = await signUpAdmin(admin);
    const target = unique("cible");
    await signUp(target);
    const { id } = await userIdOf(target);

    const started = await post("/api/auth/admin/impersonate-user", { userId: id }, cookie);
    expect(started.status).toBe(200);
    cookie = jar(cookie, started);
    expect(await (await get("/api/auth/me", cookie)).json()).toEqual({
      signedIn: true,
      handle: target,
      email: `${target}@occulis.test`,
      emailVerified: true,
      admin: false,
      impersonating: true,
      providers: [],
    });
    // Sous l'identité d'emprunt, le back-office se ferme : c'est le rôle du joueur qui vaut.
    expect((await get("/api/admin/stats", cookie)).status).toBe(403);

    const stopped = await post("/api/auth/admin/stop-impersonating", {}, cookie);
    expect(stopped.status).toBe(200);
    cookie = jar(cookie, stopped);
    expect(await (await get("/api/auth/me", cookie)).json()).toMatchObject({
      handle: admin,
      admin: true,
      impersonating: false,
    });
  });

  it("refuse d'usurper un autre administrateur", async () => {
    const cookie = await signUpAdmin(unique("chef"));
    const other = unique("chef");
    await signUpAdmin(other);
    const { id } = await userIdOf(other);
    expect((await post("/api/auth/admin/impersonate-user", { userId: id }, cookie)).status).toBe(403);
  });
});

describe("back-office : parties et profils", () => {
  it("liste les parties d'un joueur, avec les pseudos et le nombre de coups", async () => {
    const cookie = await signUpAdmin(unique("chef"));
    const a = `p-${crypto.randomUUID()}`;
    const b = `p-${crypto.randomUUID()}`;
    const c = `p-${crypto.randomUUID()}`;
    const first = await startMatch(a, b);
    await startMatch(c, b);
    await env.DB.prepare("INSERT INTO match_actions (match_id, seq, action) VALUES (?, 0, ?)")
      .bind(first, JSON.stringify({ kind: "resign" }))
      .run();

    const page = (await (await get(`/api/admin/matches?player=${a}`, cookie)).json()) as AdminMatchPage;
    expect(page.total).toBe(1);
    expect(page.matches[0]).toMatchObject({
      id: first,
      playerA: { id: a, handle: a },
      playerB: { id: b, handle: b },
      finishedAt: null,
      actions: 1,
    });

    const both = (await (await get(`/api/admin/matches?player=${b}&limit=1`, cookie)).json()) as AdminMatchPage;
    expect(both.total).toBe(2);
    expect(both.matches).toHaveLength(1);

    const detail = (await (await get(`/api/admin/matches/${first}`, cookie)).json()) as AdminMatchDetail;
    // Le camp vient du rejeu : l'action sérialisée ne le porte pas.
    expect(detail.log).toEqual([{ seq: 0, player: "A", action: { kind: "resign" } }]);
    expect(detail.replayError).toBeNull();
    // Une image de départ, puis une par coup ; chaque camp voit au moins ses pièces.
    expect(detail.frames).toHaveLength(2);
    const [start] = detail.frames;
    expect(start?.pieces.length).toBeGreaterThan(0);
    for (const piece of start?.pieces ?? []) {
      expect(start?.visible[piece.owner]).toContain(`${piece.x},${piece.y}`);
    }

    expect((await get(`/api/admin/matches/inconnue`, cookie)).status).toBe(404);
  });

  it("tient le bilan d'un joueur, quel que soit son siège", async () => {
    const cookie = await signUpAdmin(unique("chef"));
    const me = `p-${crypto.randomUUID()}`;
    const other = `p-${crypto.randomUUID()}`;
    const won = await startMatch(me, other);
    const lost = await startMatch(other, me);
    await startMatch(me, other);

    const finish = env.DB.prepare("UPDATE matches SET finished_at = ?, outcome = ? WHERE id = ?");
    await env.DB.batch([
      finish.bind(1, JSON.stringify({ kind: "victory", winner: "A", reason: "resignation" }), won),
      finish.bind(1, JSON.stringify({ kind: "victory", winner: "A", reason: "resignation" }), lost),
    ]);

    const player = (await (await get(`/api/admin/players/${me}`, cookie)).json()) as AdminPlayer;
    expect(player.record).toEqual({ played: 3, won: 1, lost: 1, ongoing: 1 });
    expect(player.userId).toBeNull();

    const stats = (await (await get("/api/admin/stats", cookie)).json()) as AdminStats;
    expect(stats.matches).toBeGreaterThanOrEqual(3);
    expect(stats.admins).toBeGreaterThanOrEqual(1);
  });

  it("renomme le profil et le compte d'un même geste", async () => {
    const cookie = await signUpAdmin(unique("chef"));
    const target = unique("cible");
    const taken = unique("pris");
    await signUp(target);
    await signUp(taken);
    const { player_id } = await userIdOf(target);
    const renamed = unique("renomme");

    const rename = (handle: string) =>
      SELF.fetch(`https://occulis.test/api/admin/players/${player_id}/handle`, {
        method: "POST",
        headers: { Cookie: cookie, Origin: "https://occulis.test", "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });

    expect((await rename(renamed)).status).toBe(200);
    const row = await env.DB.prepare(
      "SELECT users.name, players.handle FROM users JOIN players ON players.id = users.player_id WHERE players.id = ?",
    )
      .bind(player_id)
      .first();
    expect(row).toEqual({ name: renamed, handle: renamed });

    // Un pseudo pris laisse les deux tables intactes.
    expect((await rename(taken)).status).toBe(422);
    expect((await userIdOf(renamed)).player_id).toBe(player_id);
    expect((await rename("x")).status).toBe(400);
  });
});
