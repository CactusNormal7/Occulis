import { PENDING_TTL_MS, type BetaStore, type Signup } from "./beta";

interface Row {
  id: string;
  email: string;
  status: "pending" | "confirmed";
  created_at: number;
}

const toSignup = (row: Row): Signup => ({
  id: row.id,
  email: row.email,
  status: row.status,
  createdAt: row.created_at,
});

/** La liste de la beta dans la base D1 du site (`migrations/`). */
export function d1Store(db: D1Database): BetaStore {
  return {
    async find(email) {
      const row = await db
        .prepare("SELECT id, email, status, created_at FROM beta_signups WHERE email = ?")
        .bind(email)
        .first<Row>();
      return row === null ? undefined : toSignup(row);
    },

    async savePending(signup, tokenHash, consentText) {
      await db
        .prepare(
          `INSERT INTO beta_signups (id, email, status, confirm_token_hash, consent_text, created_at)
           VALUES (?, ?, 'pending', ?, ?, ?)
           ON CONFLICT (email) DO UPDATE SET
             confirm_token_hash = excluded.confirm_token_hash,
             consent_text = excluded.consent_text,
             created_at = excluded.created_at
           WHERE beta_signups.status = 'pending'`,
        )
        .bind(signup.id, signup.email, tokenHash, consentText, signup.createdAt)
        .run();
    },

    async confirm(tokenHash, now) {
      const row = await db
        .prepare(
          `UPDATE beta_signups
           SET status = 'confirmed', confirmed_at = ?, confirm_token_hash = NULL
           WHERE confirm_token_hash = ? AND status = 'pending' AND created_at > ?
           RETURNING id, email, status, created_at`,
        )
        .bind(now, tokenHash, now - PENDING_TTL_MS)
        .first<Row>();
      return row === null ? undefined : toSignup(row);
    },

    async remove(id) {
      const result = await db.prepare("DELETE FROM beta_signups WHERE id = ?").bind(id).run();
      return result.meta.changes > 0;
    },

    async purgePending(before) {
      const result = await db
        .prepare("DELETE FROM beta_signups WHERE status = 'pending' AND created_at < ?")
        .bind(before)
        .run();
      return result.meta.changes;
    },
  };
}
