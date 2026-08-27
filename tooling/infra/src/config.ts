import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(here, "../../..");
export const SERVER_DIR = resolve(ROOT, "apps/server");
export const TOML = resolve(SERVER_DIR, "wrangler.toml");

export const PLACEHOLDER = "REMPLACER_PAR_L_ID";

export type EnvName = "local" | "staging" | "production";

export const ENVS: EnvName[] = ["local", "staging", "production"];

export function dbName(env: EnvName): string {
  return { local: "occulis-local", staging: "occulis-staging", production: "occulis-prod" }[env];
}

// Les bindings ne sont pas hérités par les environnements nommés : toute commande
// visant staging ou production doit porter --env, sinon wrangler ne lit que la
// configuration par défaut et ne voit qu'occulis-local.
export function envFlag(env: EnvName): string[] {
  return env === "local" ? [] : ["--env", env];
}
