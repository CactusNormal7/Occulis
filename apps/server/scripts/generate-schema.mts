/**
 * Recrache le schéma SQL que Better Auth attend, à recopier dans une migration D1.
 *
 * À rejouer à chaque changement de configuration qui touche le stockage — un greffon
 * ajouté (OAuth, 2FA), un champ supplémentaire, une table renommée. Le schéma n'est
 * jamais écrit à la main : la bibliothèque émet ses requêtes sur ces noms exacts.
 *
 * La base en mémoire ne sert qu'à fixer le dialecte SQLite, celui que parle D1 ; rien
 * n'y est écrit. L'erreur « Database schema mismatch » affichée en fin d'exécution est
 * donc attendue, et sans objet ici.
 */
import { DatabaseSync } from "node:sqlite";
import { getMigrations } from "better-auth/db/migration";
import { buildAuth } from "../src/auth/better-auth.js";

const env = { DB: new DatabaseSync(":memory:") } as unknown as Env;
const plan = await getMigrations(buildAuth(env, "https://occulis.0kl.fr").options, {
  throwOnUnsafe: false,
});

console.log(await plan.compileMigrations());
