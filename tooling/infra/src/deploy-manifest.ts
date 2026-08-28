import { readFileSync, writeFileSync } from "node:fs";
import { DEPLOY_MANIFEST } from "./config.js";

type Manifest = Record<string, { wranglerEnv: string; d1Database: string }>;

// Contrairement à wrangler.toml, c'est du JSON réel — pas besoin de
// manipulation ligne à ligne. La clé est le nom de branche BRUT (avec ses
// éventuels "/"), pour matcher $GITHUB_REF_NAME tel que ci.yml le lit.
export function upsertDeployEnvironment(
  branch: string,
  wranglerEnv: string,
  d1Database: string,
): "created" | "updated" {
  const manifest = JSON.parse(readFileSync(DEPLOY_MANIFEST, "utf8")) as Manifest;
  const outcome = manifest[branch] ? "updated" : "created";
  manifest[branch] = { wranglerEnv, d1Database };
  writeFileSync(DEPLOY_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  return outcome;
}
