/**
 * Recrache le schéma SQL que Better Auth attend, à recopier dans une migration D1.
 *
 * À rejouer à chaque changement de configuration qui touche le stockage — un greffon
 * ajouté (OAuth, 2FA), un champ supplémentaire, une table renommée. Le schéma n'est
 * jamais écrit à la main : la bibliothèque émet ses requêtes sur ces noms exacts.
 *
 * La base en mémoire reçoit d'abord les migrations existantes : ce qui est recraché est
 * donc le **delta** à poser dans la prochaine migration (`ALTER TABLE …`), et rien du
 * tout si le schéma est à jour. Elle fixe aussi le dialecte SQLite, celui que parle D1.
 * L'erreur « Database schema mismatch » affichée en fin d'exécution signale ce même
 * delta, et disparaît une fois la migration écrite.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { getMigrations } from "better-auth/db/migration";
import { buildAuth } from "../src/auth/better-auth.js";

const database = new DatabaseSync(":memory:");
// Un chemin et non une `URL` : le script voit à la fois les types de Node et ceux des
// Workers, qui déclarent chacun leur `URL` globale, et les fonctions de `node:fs`
// n'acceptent que la première.
const directory = join(dirname(fileURLToPath(import.meta.url)), "../migrations");
for (const file of readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()) {
  database.exec(readFileSync(join(directory, file), "utf8"));
}

const env = { DB: database } as unknown as Env;
const plan = await getMigrations(buildAuth(env, "https://occulis.0kl.fr").options, {
  throwOnUnsafe: false,
});

console.log(await plan.compileMigrations());
