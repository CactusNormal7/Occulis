import { ROOT } from "./config.js";
import { runStreaming } from "./wrangler.js";

// null si HEAD détaché — il n'y a alors pas de nom de branche à dériver.
export async function currentBranch(): Promise<string | null> {
  const { code, stdout } = await runStreaming("git", ["rev-parse", "--abbrev-ref", "HEAD"], ROOT);
  const branch = stdout.trim();
  if (code !== 0 || !branch || branch === "HEAD") return null;
  return branch;
}
