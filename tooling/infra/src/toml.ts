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
