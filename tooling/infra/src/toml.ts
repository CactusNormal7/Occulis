import { readFileSync, writeFileSync } from "node:fs";
import { PLACEHOLDER, TOML, type EnvName } from "./config.js";

// Le bloc par défaut (local) n'est pas préfixé ; les environnements nommés le sont.
function blockHeader(env: EnvName): string {
  return env === "local" ? "[[d1_databases]]" : `[[env.${env}.d1_databases]]`;
}

export function envBlockExists(env: EnvName): boolean {
  const lines = readFileSync(TOML, "utf8").split("\n");
  return lines.some((l) => l.trim() === `[env.${env}]`);
}

// Ajoute un bloc d'environnement de branche complet, sur le modèle exact des
// blocs [env.staging]/[env.production] déjà présents (routes, assets, DO,
// D1) — pas de lib TOML dans cet outil, on reste sur de la génération de
// texte cohérente avec patchDatabaseId/blockHeader ci-dessus.
export function appendEnvBlock(env: EnvName, databaseName: string): void {
  if (envBlockExists(env)) return;
  const block = `
[env.${env}]
name = "occulis-${env}"

routes = [{ pattern = "occulis-${env}.0kl.fr", custom_domain = true }]

[env.${env}.assets]
directory = "../web/dist"
binding = "ASSETS"

[[env.${env}.durable_objects.bindings]]
name = "MATCH"
class_name = "MatchDO"

[[env.${env}.d1_databases]]
binding = "DB"
database_name = "${databaseName}"
database_id = "${PLACEHOLDER}"
`;
  const current = readFileSync(TOML, "utf8");
  writeFileSync(TOML, current.replace(/\n*$/, "\n") + block);
}

// Retire le bloc [env.<env>] et tous ses sous-blocs ([env.<env>.assets],
// [[env.<env>.durable_objects.bindings]], [[env.<env>.d1_databases]]…), plus les
// lignes vides qui le précèdent. S'arrête à la première section étrangère ou en
// fin de fichier. Inverse d'appendEnvBlock.
export function removeEnvBlock(env: EnvName): boolean {
  const lines = readFileSync(TOML, "utf8").split("\n");
  const start = lines.findIndex((l) => l.trim() === `[env.${env}]`);
  if (start < 0) return false;

  const belongs = (header: string): boolean =>
    header === `[env.${env}]` ||
    header.startsWith(`[env.${env}.`) ||
    header.startsWith(`[[env.${env}.`);

  let end = start + 1;
  for (; end < lines.length; end++) {
    const t = lines[end]!.trim();
    if (t.startsWith("[") && !belongs(t)) break;
  }
  // Ne pas emporter les lignes vides qui séparent d'un bloc suivant : une seule
  // ligne vide, en amont, appartient au bloc (cf. appendEnvBlock).
  while (end > start + 1 && lines[end - 1]!.trim() === "") end--;

  let from = start;
  while (from > 0 && lines[from - 1]!.trim() === "") from--;

  lines.splice(from, end - from);
  writeFileSync(
    TOML,
    `${lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s*$/, "")}\n`,
  );
  return true;
}

// Remplace la valeur de database_id dans le bloc d1 de l'environnement visé.
export function patchDatabaseId(env: EnvName, id: string): void {
  const lines = readFileSync(TOML, "utf8").split("\n");
  const header = blockHeader(env);
  const start = lines.findIndex((l) => l.trim() === header);
  if (start < 0) throw new Error(`Bloc ${header} introuvable dans ${TOML}`);

  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i]!.startsWith("[")) break;
    if (/^\s*database_id\s*=/.test(lines[i]!)) {
      lines[i] = `database_id = "${id}"`;
      writeFileSync(TOML, lines.join("\n"));
      return;
    }
  }
  throw new Error(`database_id introuvable sous ${header}`);
}

// Ne juge que l'environnement visé : un placeholder resté sur prod ne doit pas
// empêcher de travailler sur staging.
export function configuredDatabaseId(env: EnvName): string | null {
  const lines = readFileSync(TOML, "utf8").split("\n");
  const start = lines.findIndex((l) => l.trim() === blockHeader(env));
  if (start < 0) return null;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i]!.startsWith("[")) break;
    const found = lines[i]!.match(/^\s*database_id\s*=\s*"([^"]*)"/);
    if (found) return found[1]!;
  }
  return null;
}
