#!/usr/bin/env tsx
// Point d'entrée non interactif pour piloter tooling/infra depuis un environnement
// sans TTY (GitHub Actions workflow_dispatch — voir .github/workflows/infra.yml).
// Réutilise le même catalogue ACTIONS que la TUI (cli.tsx) : aucune logique dupliquée.
import { ACTIONS, type Level } from "./actions.js";
import { LEVEL_PREFIX, LEVEL_COLOR } from "./components/theme.js";

const COLOR_CODE: Record<string, string> = {
  green: "32",
  yellow: "33",
  red: "31",
  cyan: "36",
  gray: "90",
};

let sawFail = false;

function log(text: string, level: Level = "info"): void {
  if (level === "fail") sawFail = true;
  const code = COLOR_CODE[LEVEL_COLOR[level] ?? ""];
  const body = `${LEVEL_PREFIX[level]}${text}`;
  process.stdout.write(code ? `\x1b[${code}m${body}\x1b[0m\n` : `${body}\n`);
}

const [, , id, envArg, queryArg] = process.argv;
const env = envArg || null;
const query = queryArg || null;

const action = ACTIONS.find((a) => a.id === id);
if (!action) {
  process.stderr.write(
    `Action inconnue : « ${id ?? ""} ». Disponibles : ${ACTIONS.map((a) => a.id).join(", ")}\n`,
  );
  process.exit(1);
}
// dev / tail / login prennent le contrôle total du terminal (serveur long, navigateur,
// stream infini) : aucun sens en CI, où il n'y a ni TTY ni personne pour les interrompre.
if (action.interactive) {
  process.stderr.write(
    `« ${action.id} » exige un terminal interactif — inutilisable en CI. Lance-le via « pnpm infra » en local.\n`,
  );
  process.exit(1);
}
if (action.needsEnv && !env) {
  process.stderr.write(`« ${action.id} » exige un environnement (2e argument).\n`);
  process.exit(1);
}

action
  .run({ env, query, log })
  .then(() => process.exit(sawFail ? 1 : 0))
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
