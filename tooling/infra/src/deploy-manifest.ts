import { readFileSync, writeFileSync } from "node:fs";
import { DEPLOY_MANIFEST, isBranchEnv, listEnvNames, type EnvName } from "./config.js";

type Manifest = Record<string, { wranglerEnv: string; d1Database: string }>;

export interface DeployEnvironment {
  /** Nom de branche BRUT (avec ses éventuels "/"), tel qu'il sert de clé au manifeste. */
  branch: string;
  wranglerEnv: EnvName;
  d1Database: string;
}

function read(): Manifest {
  return JSON.parse(readFileSync(DEPLOY_MANIFEST, "utf8")) as Manifest;
}

function write(manifest: Manifest): void {
  writeFileSync(DEPLOY_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

// Contrairement à wrangler.toml, c'est du JSON réel — pas besoin de
// manipulation ligne à ligne. La clé est le nom de branche BRUT (avec ses
// éventuels "/"), pour matcher $GITHUB_REF_NAME tel que ci.yml le lit.
export function upsertDeployEnvironment(
  branch: string,
  wranglerEnv: string,
  d1Database: string,
): "created" | "updated" {
  const manifest = read();
  const outcome = manifest[branch] ? "updated" : "created";
  manifest[branch] = { wranglerEnv, d1Database };
  write(manifest);
  return outcome;
}

export function listDeployEnvironments(): DeployEnvironment[] {
  return Object.entries(read()).map(([branch, entry]) => ({ branch, ...entry }));
}

// Désigner un environnement par son nom de branche ou par son slug wrangler revient
// au même ; les deux ne diffèrent que sur les branches contenant un "/". Accepter les
// deux évite d'avoir à se souvenir lequel le manifeste porte en clé.
export function findDeployEnvironment(target: string): DeployEnvironment | null {
  const all = listDeployEnvironments();
  return all.find((e) => e.branch === target) ?? all.find((e) => e.wranglerEnv === target) ?? null;
}

// Les environnements supprimables : ceux qui existent dans le toml, dans le manifeste, ou
// dans les deux — l'union, pour qu'un environnement à moitié défait reste réparable depuis
// la TUI plutôt qu'à la main.
export function listBranchEnvNames(): EnvName[] {
  const declared = [...listEnvNames(), ...listDeployEnvironments().map((e) => e.wranglerEnv)];
  return [...new Set(declared.filter(isBranchEnv))].sort();
}

export function removeDeployEnvironment(branch: string): boolean {
  const manifest = read();
  if (!manifest[branch]) return false;
  delete manifest[branch];
  write(manifest);
  return true;
}
