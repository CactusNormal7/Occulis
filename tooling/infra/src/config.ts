import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(here, "../../..");
export const SERVER_DIR = resolve(ROOT, "apps/server");
export const TOML = resolve(SERVER_DIR, "wrangler.toml");
export const DEPLOY_MANIFEST = resolve(ROOT, ".github/deploy-environments.json");

export const PLACEHOLDER = "REMPLACER_PAR_L_ID";

export type EnvName = string;

const FIXED_DB_NAMES: Record<string, string> = {
  local: "occulis-local",
  staging: "occulis-staging",
  production: "occulis-prod",
};

export function dbName(env: EnvName): string {
  return FIXED_DB_NAMES[env] ?? `occulis-${env}`;
}

// Les trois environnements fixes ne se créent ni ne se suppriment : tout le reste est un
// environnement de branche, donc jetable. C'est ce qui distingue les deux populations.
export function isBranchEnv(env: EnvName): boolean {
  return !(env in FIXED_DB_NAMES);
}

// "local" n'est jamais un bloc nommé dans le toml ; les autres sont découverts
// dynamiquement, pour que tout environnement de branche déjà créé apparaisse
// sans devoir étendre une liste figée à la main.
export function listEnvNames(): EnvName[] {
  const lines = readFileSync(TOML, "utf8").split("\n");
  const found: EnvName[] = [];
  for (const line of lines) {
    const match = line.trim().match(/^\[env\.([^.\]]+)\]$/);
    if (match) found.push(match[1]!);
  }
  return ["local", ...found];
}

// Nom de branche complet normalisé, `/` → `-` (docs/architecture.md section 4).
export function slugifyBranch(branch: string): string {
  return branch.replace(/\//g, "-");
}

// Les bindings ne sont pas hérités par les environnements nommés : toute commande
// visant staging ou production doit porter --env, sinon wrangler ne lit que la
// configuration par défaut et ne voit qu'occulis-local.
export function envFlag(env: EnvName): string[] {
  return env === "local" ? [] : ["--env", env];
}
