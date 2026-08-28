import { spawn } from "node:child_process";
import { SERVER_DIR } from "./config.js";

export type LineSink = (line: string, stream: "out" | "err") => void;

export interface RunResult {
  code: number;
  stdout: string;
}

// Runner générique : streame chaque ligne de stdout/stderr et accumule stdout.
// `input` alimente stdin puis le ferme — de quoi répondre « y » aux confirmations
// de wrangler (d1 delete, delete) sans TTY.
export function runStreaming(
  command: string,
  args: string[],
  cwd: string,
  onLine?: LineSink,
  input?: string,
): Promise<RunResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    if (input !== undefined && child.stdin) {
      child.stdin.on("error", () => {});
      child.stdin.write(input);
      child.stdin.end();
    }

    let stdout = "";
    const buffers: Record<"out" | "err", string> = { out: "", err: "" };

    const pump = (chunk: Buffer, stream: "out" | "err") => {
      const text = chunk.toString();
      if (stream === "out") stdout += text;
      buffers[stream] += text;
      const parts = buffers[stream].split("\n");
      buffers[stream] = parts.pop() ?? "";
      for (const line of parts) onLine?.(line, stream);
    };

    child.stdout.on("data", (c) => pump(c, "out"));
    child.stderr.on("data", (c) => pump(c, "err"));
    child.on("error", reject);
    child.on("close", (code) => {
      for (const stream of ["out", "err"] as const) {
        if (buffers[stream]) onLine?.(buffers[stream], stream);
      }
      resolvePromise({ code: code ?? 0, stdout });
    });
  });
}

// Exécute `pnpm exec wrangler …` depuis apps/server, en streamant chaque ligne.
export function runWrangler(args: string[], onLine?: LineSink, input?: string): Promise<RunResult> {
  return runStreaming("pnpm", ["exec", "wrangler", ...args], SERVER_DIR, onLine, input);
}

// Commandes qui exigent un vrai TTY (login navigateur, serveur long, tail).
// Ink doit être démonté avant, le contrôle du terminal leur est rendu.
export function runWranglerInherited(args: string[]): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("pnpm", ["exec", "wrangler", ...args], {
      cwd: SERVER_DIR,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => resolvePromise(code ?? 0));
  });
}

export function runInherited(command: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => resolvePromise(code ?? 0));
  });
}

// wrangler préfixe sa sortie de bandeaux (proxy, mises à jour) : on repart de la
// première ligne qui ouvre réellement le tableau JSON, pas du premier crochet venu.
export async function listRemoteDatabases(): Promise<Array<{ name: string; id: string }>> {
  const { stdout } = await runWrangler(["d1", "list", "--json"]);
  const lines = stdout.split("\n");
  const start = lines.findIndex((l) => l.trimStart().startsWith("["));
  if (start < 0) return [];
  try {
    const parsed = JSON.parse(lines.slice(start).join("\n")) as Array<Record<string, string>>;
    return parsed.map((d) => ({ name: d.name!, id: d.uuid ?? d.database_id ?? "" }));
  } catch {
    return [];
  }
}

export async function remoteDatabaseId(name: string): Promise<string> {
  const found = (await listRemoteDatabases()).find((d) => d.name === name);
  return found?.id ?? "";
}
