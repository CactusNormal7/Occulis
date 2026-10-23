import { handleKey } from "./auth/handle.js";
import { MESSAGE_RETENTION_MS } from "./social/chat.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Un profil sans compte ni partie, créé il y a plus d'un jour : ce que laisse une
 * inscription qui échoue entre la création du profil et celle du compte
 * (`databaseHooks.user.create`), ou un compte supprimé qui n'a jamais joué. Ceux qui ont
 * joué restent : les logs de leurs parties les référencent.
 */
const ORPHAN_PLAYER = `created_at < ?1
  AND NOT EXISTS (SELECT 1 FROM users WHERE users.player_id = players.id)
  AND NOT EXISTS (SELECT 1 FROM matches WHERE matches.player_a = players.id OR matches.player_b = players.id)`;

/**
 * Le ménage nocturne. Rien ici n'est visible du joueur : ce sont des lignes que plus
 * personne ne lit et que rien n'effacerait autrement — une session périmée reste refusée
 * à la connexion, mais elle reste aussi en base indéfiniment.
 *
 * Chaque purge part seule : un lot unique est transactionnel, et une seule ligne
 * retenue par une clé étrangère suffisait à n'en plus rien purger du tout — messages de
 * plus de 90 jours compris. Une purge qui échoue est journalisée et retentée la nuit
 * suivante, sans retenir les autres.
 */
export async function sweep(env: Env, now: number = Date.now()): Promise<void> {
  // Better Auth range ses échéances en **texte ISO**, pas en millisecondes : les
  // comparer à un nombre ne supprimerait rien du tout, SQLite classant tout entier
  // avant tout texte. `lastRequest` est la seule qui soit vraiment numérique.
  const isoNow = new Date(now).toISOString();
  const db = env.DB;
  const purges: readonly (readonly [string, () => Promise<unknown>])[] = [
    ["sessions", () => db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(isoNow).run()],
    [
      "verifications",
      () => db.prepare("DELETE FROM verifications WHERE expires_at < ?").bind(isoNow).run(),
    ],
    // Le compteur de débit se reconstruit seul : une fenêtre écoulée ne vaut plus rien.
    // On garde une journée de marge sur la plus longue fenêtre configurée.
    [
      "rate-limits",
      () =>
        db
          .prepare("DELETE FROM rate_limits WHERE lastRequest < ?")
          .bind(now - DAY_MS)
          .run(),
    ],
    // Ses presets d'abord : ils référencent le profil, qui ne partirait pas sans eux.
    [
      "orphan-players",
      () =>
        db.batch([
          db
            .prepare(
              `DELETE FROM team_presets WHERE player_id IN (SELECT id FROM players WHERE ${ORPHAN_PLAYER})`,
            )
            .bind(now - DAY_MS),
          db.prepare(`DELETE FROM players WHERE ${ORPHAN_PLAYER}`).bind(now - DAY_MS),
        ]),
    ],
    ["handle-keys", () => backfillHandleKeys(db)],
    [
      "messages",
      () =>
        db
          .prepare("DELETE FROM messages WHERE created_at < ?")
          .bind(now - MESSAGE_RETENTION_MS)
          .run(),
    ],
  ];

  const results = await Promise.allSettled(purges.map(([, purge]) => purge()));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const purge = purges[index]?.[0];
      console.error(JSON.stringify({ event: "purge-failed", purge, cause: String(result.reason) }));
    }
  });
}

/**
 * Les pseudos hors ASCII d'avant la migration 0011 n'ont pas encore de clé d'unicité :
 * SQLite ne sait pas la calculer (`handleKey()`). Un doublon qu'elle révèlerait
 * (« Élodie » face à « élodie ») est journalisé et laissé sans clé — c'est à un
 * administrateur de renommer l'un des deux, pas au ménage de choisir.
 */
async function backfillHandleKeys(db: D1Database): Promise<void> {
  const missing = await db
    .prepare("SELECT id, handle FROM players WHERE handle_key IS NULL LIMIT 500")
    .all<{ id: string; handle: string }>();
  for (const row of missing.results) {
    try {
      await db
        .prepare("UPDATE players SET handle_key = ? WHERE id = ? AND handle_key IS NULL")
        .bind(handleKey(row.handle), row.id)
        .run();
    } catch {
      console.error(JSON.stringify({ event: "handle-key-conflict", player: row.id }));
    }
  }
}
