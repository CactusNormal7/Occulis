import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "./index.js";

/**
 * Le ménage nocturne. Il mérite un test parce que rien ne signalerait sa panne : une
 * purge qui ne supprime rien laisse un service parfaitement fonctionnel, avec des
 * tables qui enflent. C'est exactement ce qui se produisait tant que les échéances
 * étaient comparées à un nombre de millisecondes, quand Better Auth y range du texte
 * ISO 8601 — et SQLite classe tout entier avant tout texte, donc la condition était
 * fausse pour toutes les lignes.
 */
async function sweep(): Promise<void> {
  // Le gestionnaire ignore son contrôleur et son contexte : il n'a rien à programmer
  // au-delà de sa propre requête, et tout ce qu'il fait est attendu ici.
  await worker.scheduled({} as ScheduledController, env);
}

async function seedUser(id: string): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO players (id, handle, created_at) VALUES (?, ?, ?)")
    .bind(`player-${id}`, `menage-${id}`, Date.now())
    .run();
  await env.DB.prepare(
    "INSERT INTO users (id, name, email, email_verified, created_at, updated_at, player_id) VALUES (?, ?, ?, 1, ?, ?, ?)",
  )
    .bind(id, `menage-${id}`, `${id}@occulis.test`, now, now, `player-${id}`)
    .run();
}

async function seedSession(id: string, userId: string, expiresAt: Date): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (id, token, user_id, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(id, `jeton-${id}`, userId, expiresAt.toISOString(), now, now)
    .run();
}

const HOUR_MS = 60 * 60 * 1000;

describe("ménage périodique", () => {
  it("supprime les sessions périmées et garde les vivantes", async () => {
    await seedUser("menage-sessions");
    await seedSession("perimee", "menage-sessions", new Date(Date.now() - HOUR_MS));
    await seedSession("vivante", "menage-sessions", new Date(Date.now() + HOUR_MS));

    await sweep();

    const remaining = await env.DB.prepare("SELECT id FROM sessions WHERE user_id = ?")
      .bind("menage-sessions")
      .all<{ id: string }>();
    expect(remaining.results.map((row) => row.id)).toEqual(["vivante"]);
  });

  it("supprime les jetons de vérification expirés", async () => {
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB
        .prepare(
          "INSERT INTO verifications (id, identifier, value, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("verif-morte", "mort@occulis.test", "x", new Date(Date.now() - HOUR_MS).toISOString(), now, now),
      env.DB
        .prepare(
          "INSERT INTO verifications (id, identifier, value, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("verif-vive", "vif@occulis.test", "x", new Date(Date.now() + HOUR_MS).toISOString(), now, now),
    ]);

    await sweep();

    const remaining = await env.DB.prepare(
      "SELECT id FROM verifications WHERE id IN ('verif-morte', 'verif-vive')",
    ).all<{ id: string }>();
    expect(remaining.results.map((row) => row.id)).toEqual(["verif-vive"]);
  });

  it("supprime les compteurs de débit retombés et garde les récents", async () => {
    await env.DB.batch([
      env.DB
        .prepare("INSERT INTO rate_limits (id, key, count, lastRequest) VALUES (?, ?, ?, ?)")
        .bind("debit-vieux", "10.0.0.1|/sign-in/email", 5, Date.now() - 48 * HOUR_MS),
      env.DB
        .prepare("INSERT INTO rate_limits (id, key, count, lastRequest) VALUES (?, ?, ?, ?)")
        .bind("debit-recent", "10.0.0.2|/sign-in/email", 5, Date.now()),
    ]);

    await sweep();

    const remaining = await env.DB.prepare(
      "SELECT id FROM rate_limits WHERE id IN ('debit-vieux', 'debit-recent')",
    ).all<{ id: string }>();
    expect(remaining.results.map((row) => row.id)).toEqual(["debit-recent"]);
  });

  it("convertit les millisecondes en texte ISO comme le fait la bibliothèque", async () => {
    // La migration 0004 reprend les comptes existants en traduisant leurs horodatages
    // avec cette expression exacte. Si elle cessait de produire le format que Better
    // Auth relit, les comptes d'avant la migration porteraient des dates fausses.
    const converted = await env.DB.prepare(
      "SELECT strftime('%Y-%m-%dT%H:%M:%fZ', ? / 1000.0, 'unixepoch') AS iso",
    )
      .bind(Date.UTC(2026, 8, 6, 11, 4, 7, 26))
      .first<{ iso: string }>();

    expect(converted?.iso).toBe("2026-09-06T11:04:07.026Z");
  });
});
