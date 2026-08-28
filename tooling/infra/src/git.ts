import { ROOT } from "./config.js";
import { runStreaming, type LineSink } from "./wrangler.js";

// null si HEAD détaché — il n'y a alors pas de nom de branche à dériver.
export async function currentBranch(): Promise<string | null> {
  const { code, stdout } = await runStreaming("git", ["rev-parse", "--abbrev-ref", "HEAD"], ROOT);
  const branch = stdout.trim();
  if (code !== 0 || !branch || branch === "HEAD") return null;
  return branch;
}

// Vrai si l'un des chemins donnés a une modification (indexée ou non).
export async function pathsHaveChanges(paths: string[]): Promise<boolean> {
  const { stdout } = await runStreaming("git", ["status", "--porcelain", "--", ...paths], ROOT);
  return stdout.trim().length > 0;
}

// Committe *uniquement* ces chemins (pathspec), quel que soit le reste de l'index :
// l'outil ne s'approprie pas les autres changements du dépôt.
export async function commitPaths(
  message: string,
  paths: string[],
  onLine?: LineSink,
): Promise<number> {
  const { code } = await runStreaming(
    "git",
    ["commit", "-m", message, "--", ...paths],
    ROOT,
    onLine,
  );
  return code;
}

export async function pushCurrentBranch(onLine?: LineSink): Promise<number> {
  const branch = await currentBranch();
  if (!branch) return 1;
  const upstream = await runStreaming(
    "git",
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    ROOT,
  );
  const args = upstream.code === 0 ? ["push"] : ["push", "-u", "origin", branch];
  const { code } = await runStreaming("git", args, ROOT, onLine);
  return code;
}
