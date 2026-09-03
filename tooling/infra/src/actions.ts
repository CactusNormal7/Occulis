import { existsSync, readFileSync } from "node:fs";
import {
  ROOT,
  dbName,
  envFlag,
  isBranchEnv,
  slugifyBranch,
  PLACEHOLDER,
  TOML,
  DEPLOY_MANIFEST,
  type EnvName,
} from "./config.js";
import {
  patchDatabaseId,
  configuredDatabaseId,
  envBlockExists,
  appendEnvBlock,
  removeEnvBlock,
} from "./toml.js";
import {
  runWrangler,
  runWranglerInherited,
  runInherited,
  runStreaming,
  remoteDatabaseId,
} from "./wrangler.js";
import { currentBranch, pathsHaveChanges, commitPaths, pushCurrentBranch } from "./git.js";
import {
  upsertDeployEnvironment,
  findDeployEnvironment,
  removeDeployEnvironment,
} from "./deploy-manifest.js";

export type Level = "info" | "ok" | "warn" | "fail" | "step" | "raw";

export interface ActionContext {
  env: EnvName | null;
  query: string | null;
  log: (text: string, level?: Level) => void;
}

export interface ActionDef {
  id: string;
  label: string;
  hint: string;
  /** Demande un environnement avant de lancer. */
  needsEnv?: boolean;
  /** Exclut `local` du sélecteur d'environnement. */
  remoteOnly?: boolean;
  /**
   * Restreint le sélecteur aux environnements de branche (toml ∪ manifeste, hors fixes).
   * Une action ainsi marquée vise une cible explicite, jamais la branche courante.
   */
  branchEnvsOnly?: boolean;
  /** Demande une saisie libre (ex: requête SQL). */
  prompt?: string;
  /**
   * Commande qui prend le contrôle total du terminal (serveur, tail, login).
   * Ink est démonté avant l'appel : la sortie s'affiche brute, `log` passe par la console.
   */
  interactive?: boolean;
  run: (ctx: ActionContext) => Promise<void>;
}

function guardPlaceholder(env: EnvName, log: ActionContext["log"]): boolean {
  const id = configuredDatabaseId(env);
  if (!id || id.startsWith(PLACEHOLDER)) {
    log(
      `database_id non renseigné pour « ${env} » dans wrangler.toml — lance « Créer une base » d'abord.`,
      "fail",
    );
    return false;
  }
  return true;
}

async function stream(ctx: ActionContext, args: string[]): Promise<number> {
  const { code } = await runWrangler(args, (line) => ctx.log(line, "raw"));
  return code;
}

function checkConfig(log: ActionContext["log"]): void {
  const toml = readFileSync(TOML, "utf8");
  let clean = true;
  if (toml.includes(PLACEHOLDER)) {
    log("wrangler.toml contient encore des placeholders — utilise « Créer une base ».", "warn");
    clean = false;
  }
  const gitignore = existsSync(`${ROOT}/.gitignore`)
    ? readFileSync(`${ROOT}/.gitignore`, "utf8")
    : "";
  if (!/^\.wrangler\/?$/m.test(gitignore)) {
    log(".wrangler/ absent de .gitignore (état local, ne doit pas être committé).", "warn");
    clean = false;
  }
  if (clean) log("Configuration complète.", "ok");
}

export const ACTIONS: ActionDef[] = [
  {
    id: "status",
    label: "Statut",
    hint: "compte, bases D1, configuration",
    async run(ctx) {
      ctx.log("Compte", "step");
      await stream(ctx, ["whoami"]);
      ctx.log("Bases D1", "step");
      await stream(ctx, ["d1", "list"]);
      ctx.log("Configuration", "step");
      checkConfig(ctx.log);
    },
  },
  {
    id: "list",
    label: "Lister les bases D1",
    hint: "wrangler d1 list",
    async run(ctx) {
      await stream(ctx, ["d1", "list"]);
    },
  },
  {
    id: "create-db",
    label: "Créer une base distante",
    hint: "crée la base et reporte le database_id dans wrangler.toml",
    needsEnv: true,
    remoteOnly: true,
    async run(ctx) {
      const env = ctx.env!;
      const name = dbName(env);
      let id = await remoteDatabaseId(name);
      if (!id) {
        ctx.log(`Création de ${name}…`, "step");
        const { code } = await runWrangler(["d1", "create", name], (l) => ctx.log(l, "raw"));
        if (code !== 0) return ctx.log("Création échouée.", "fail");
        id = await remoteDatabaseId(name);
        if (!id) return ctx.log("Création échouée : id introuvable.", "fail");
        ctx.log("Base créée.", "ok");
      } else {
        ctx.log(`${name} existe déjà.`, "warn");
      }
      patchDatabaseId(env, id);
      ctx.log(`wrangler.toml : database_id de ${env} = ${id}`, "ok");
      ctx.log("Pense à committer wrangler.toml — la CI en dépend.", "warn");
    },
  },
  {
    id: "create-branch-env",
    label: "Créer un environnement de branche",
    hint: "branche courante → wrangler.toml + base D1 + manifeste, commit et push",
    async run(ctx) {
      const branch = await currentBranch();
      if (!branch)
        return ctx.log("Impossible de déterminer la branche courante (HEAD détaché ?).", "fail");
      if (branch === "main" || branch === "staging") {
        return ctx.log(
          `« ${branch} » a déjà un environnement fixe géré par .github/deploy-environments.json — rien à faire.`,
          "fail",
        );
      }

      const env = slugifyBranch(branch);
      const name = dbName(env);

      if (envBlockExists(env)) {
        ctx.log(`Bloc [env.${env}] déjà présent dans wrangler.toml.`, "warn");
      } else {
        appendEnvBlock(env, name);
        ctx.log(`wrangler.toml : bloc [env.${env}] ajouté (routes occulis-${env}.0kl.fr).`, "ok");
      }

      let id = await remoteDatabaseId(name);
      if (!id) {
        ctx.log(`Création de ${name}…`, "step");
        const { code } = await runWrangler(["d1", "create", name], (l) => ctx.log(l, "raw"));
        if (code !== 0) return ctx.log("Création de la base échouée.", "fail");
        id = await remoteDatabaseId(name);
        if (!id) return ctx.log("Création échouée : id introuvable.", "fail");
        ctx.log("Base créée.", "ok");
      } else {
        ctx.log(`${name} existe déjà.`, "warn");
      }
      patchDatabaseId(env, id);
      ctx.log(`wrangler.toml : database_id de ${env} = ${id}`, "ok");

      ctx.log("Migrations", "step");
      if (
        (await stream(ctx, ["d1", "migrations", "apply", name, "--remote", ...envFlag(env)])) !== 0
      )
        return ctx.log("Migrations en échec.", "fail");

      const outcome = upsertDeployEnvironment(branch, env, name);
      ctx.log(
        `.github/deploy-environments.json : entrée « ${branch} » ${outcome === "created" ? "ajoutée" : "mise à jour"}.`,
        "ok",
      );

      // On ne committe que les deux fichiers que cette action a touchés : le reste
      // du dépôt reste au développeur.
      const tracked = [TOML, DEPLOY_MANIFEST];
      ctx.log("Commit et push", "step");
      if (await pathsHaveChanges(tracked)) {
        if (
          (await commitPaths(`infra: environnement de branche ${branch}`, tracked, (l) =>
            ctx.log(l, "raw"),
          )) !== 0
        )
          return ctx.log("git commit a échoué — committe et pousse à la main.", "fail");
      } else {
        ctx.log("wrangler.toml et le manifeste sont déjà à jour — rien à committer.", "warn");
      }
      if ((await pushCurrentBranch((l) => ctx.log(l, "raw"))) !== 0)
        return ctx.log("git push a échoué — pousse la branche à la main.", "fail");
      ctx.log(
        `Poussé sur « ${branch} » — la CI applique les migrations puis déploie occulis-${env}.0kl.fr.`,
        "ok",
      );
    },
  },
  {
    id: "delete-branch-env",
    label: "Supprimer un environnement de branche",
    hint: "n'importe quel environnement, depuis n'importe quelle branche",
    needsEnv: true,
    branchEnvsOnly: true,
    prompt: "Retape le nom de l'environnement (ou de sa branche) pour confirmer la suppression",
    async run(ctx) {
      const target = (ctx.env ?? "").trim();
      if (!target) return ctx.log("Aucun environnement ciblé.", "fail");

      // La cible est explicite, jamais déduite de la branche courante : un environnement
      // doit rester supprimable une fois sa branche fusionnée ou effacée.
      const entry = findDeployEnvironment(target);
      const env = entry?.wranglerEnv ?? slugifyBranch(target);
      if (!isBranchEnv(env))
        return ctx.log(`« ${env} » est un environnement fixe — suppression refusée.`, "fail");
      if (!envBlockExists(env) && !entry)
        return ctx.log(`Aucun environnement « ${env} » — rien à supprimer.`, "warn");

      const confirmation = (ctx.query ?? "").trim();
      if (confirmation !== target && confirmation !== env && confirmation !== entry?.branch)
        return ctx.log("Confirmation incorrecte — rien n'a été supprimé.", "warn");

      const name = entry?.d1Database ?? dbName(env);

      // L'ordre compte : le Worker se supprime via --env, qui lit encore son bloc
      // dans wrangler.toml — donc avant de retirer ce bloc.
      ctx.log("Suppression du Worker", "step");
      await runWrangler(["delete", ...envFlag(env)], (l) => ctx.log(l, "raw"), "y\n");

      ctx.log("Suppression de la base D1", "step");
      if (await remoteDatabaseId(name))
        await runWrangler(["d1", "delete", name, "-y"], (l) => ctx.log(l, "raw"), "y\n");
      else ctx.log(`${name} n'existe pas côté Cloudflare.`, "warn");

      if (removeEnvBlock(env)) ctx.log(`wrangler.toml : bloc [env.${env}] retiré.`, "ok");
      if (entry && removeDeployEnvironment(entry.branch))
        ctx.log(`.github/deploy-environments.json : entrée « ${entry.branch} » retirée.`, "ok");

      // Les ressources Cloudflare sont déjà détruites : à partir d'ici, plus rien ne doit
      // interrompre le compte rendu, seulement dire ce qui reste à faire à la main.
      const branch = await currentBranch();
      const tracked = [TOML, DEPLOY_MANIFEST];
      ctx.log("Commit et push", "step");
      if (!(await pathsHaveChanges(tracked))) {
        ctx.log("wrangler.toml et le manifeste étaient déjà à jour — rien à committer.", "warn");
      } else if (!branch) {
        ctx.log(
          "HEAD détaché : wrangler.toml et le manifeste sont modifiés mais non committés.",
          "warn",
        );
      } else if (
        (await commitPaths(`infra: suppression de l'environnement ${env}`, tracked, (l) =>
          ctx.log(l, "raw"),
        )) !== 0
      ) {
        ctx.log("git commit a échoué — committe et pousse à la main.", "fail");
      } else if ((await pushCurrentBranch((l) => ctx.log(l, "raw"))) !== 0) {
        ctx.log("git push a échoué — pousse la branche à la main.", "fail");
      } else {
        ctx.log(`Retrait committé et poussé sur « ${branch} ».`, "ok");
      }

      // Le manifeste est versionné : chaque branche porte sa propre copie, et c'est la
      // copie de la branche poussée que la CI lit. Retirer l'entrée ici ne la retire donc
      // pas de la branche concernée, qui redéploierait contre une base désormais absente.
      if (entry && branch && entry.branch !== branch)
        ctx.log(
          `« ${entry.branch} » garde sa propre copie du manifeste : supprime cette branche ou reporte-y le retrait, sinon un push la redéploierait.`,
          "warn",
        );

      ctx.log(
        "Environnement supprimé. L'environnement GitHub Actions homonyme, s'il existe, est inoffensif (retrait depuis Settings → Environments).",
        "ok",
      );
    },
  },
  {
    id: "migrate",
    label: "Appliquer les migrations",
    hint: "wrangler d1 migrations apply",
    needsEnv: true,
    async run(ctx) {
      const env = ctx.env!;
      const name = dbName(env);
      if (env === "local") {
        await stream(ctx, ["d1", "migrations", "apply", name, "--local"]);
        return;
      }
      if (!guardPlaceholder(env, ctx.log)) return;
      await stream(ctx, ["d1", "migrations", "apply", name, "--remote", ...envFlag(env)]);
    },
  },
  {
    id: "dev",
    label: "Lancer le serveur en local",
    hint: "build client + migrations locales + wrangler dev",
    interactive: true,
    async run(ctx) {
      ctx.log("Build du client (le Worker sert ../web/dist)", "step");
      await runInherited("pnpm", ["--filter", "@occulis/web", "build"], ROOT);
      ctx.log("Migrations locales", "step");
      await runWranglerInherited(["d1", "migrations", "apply", dbName("local"), "--local"]);
      ctx.log("Démarrage de wrangler dev — Ctrl+C pour revenir au menu.", "step");
      await runWranglerInherited(["dev"]);
    },
  },
  {
    id: "deploy",
    label: "Déployer",
    hint: "gates (typecheck/lint/test) + build + migrations + deploy",
    needsEnv: true,
    remoteOnly: true,
    async run(ctx) {
      const env = ctx.env!;
      if (!guardPlaceholder(env, ctx.log)) return;
      ctx.log("Gates", "step");
      for (const script of ["typecheck", "lint", "test"]) {
        const { code } = await runStreaming("pnpm", [script], ROOT, (l) => ctx.log(l, "raw"));
        if (code !== 0) return ctx.log(`Gate « ${script} » en échec — déploiement annulé.`, "fail");
      }
      ctx.log("Build du client", "step");
      await runStreaming("pnpm", ["--filter", "@occulis/web", "build"], ROOT, (l) =>
        ctx.log(l, "raw"),
      );
      // Migrations avant déploiement : un Worker servi contre un schéma non migré
      // échoue à la première requête.
      ctx.log("Migrations", "step");
      if (
        (await stream(ctx, [
          "d1",
          "migrations",
          "apply",
          dbName(env),
          "--remote",
          ...envFlag(env),
        ])) !== 0
      )
        return ctx.log("Migrations en échec — déploiement annulé.", "fail");
      ctx.log("Déploiement", "step");
      if ((await stream(ctx, ["deploy", ...envFlag(env)])) === 0)
        ctx.log(`Déployé vers ${env}.`, "ok");
    },
  },
  {
    id: "sql",
    label: "Exécuter une requête SQL",
    hint: "wrangler d1 execute --command",
    needsEnv: true,
    prompt: "Requête SQL",
    async run(ctx) {
      const env = ctx.env!;
      const location = env === "local" ? "--local" : "--remote";
      await stream(ctx, [
        "d1",
        "execute",
        dbName(env),
        location,
        ...envFlag(env),
        "--command",
        ctx.query ?? "",
      ]);
    },
  },
  {
    id: "info",
    label: "Décrire une base",
    hint: "taille, id, URL",
    needsEnv: true,
    async run(ctx) {
      const env = ctx.env!;
      await stream(ctx, ["d1", "info", dbName(env), ...envFlag(env)]);
    },
  },
  {
    id: "tail",
    label: "Logs en direct",
    hint: "wrangler tail",
    needsEnv: true,
    remoteOnly: true,
    interactive: true,
    async run(ctx) {
      const env = ctx.env!;
      ctx.log("Streaming des logs — Ctrl+C pour revenir au menu.", "step");
      await runWranglerInherited(["tail", ...envFlag(env)]);
    },
  },
  {
    id: "deployments",
    label: "Historique des déploiements",
    hint: "wrangler deployments list",
    needsEnv: true,
    remoteOnly: true,
    async run(ctx) {
      const env = ctx.env!;
      await stream(ctx, ["deployments", "list", ...envFlag(env)]);
    },
  },
  {
    id: "login",
    label: "Connexion Cloudflare",
    hint: "wrangler login (ouvre le navigateur)",
    interactive: true,
    async run() {
      await runWranglerInherited(["login"]);
      await runWranglerInherited(["whoami"]);
    },
  },
];
