import { cp, readFile, rm } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Connect, type Plugin } from "vite";

/**
 * Les maquettes de `docs/mockups/` sont exposées sous `/mockups`.
 *
 * Elles restent de la documentation : jamais importées par le client, jamais
 * présentes dans le build de production. En développement elles sont lues
 * directement dans `docs/` ; le build ne les copie que sous le mode `mockups`,
 * celui de `pnpm --filter @occulis/web build:local`. `pnpm build`, donc la CI et
 * tout déploiement, tourne en mode `production` et n'embarque rien.
 *
 * Le mode ne s'appelle pas `local` : Vite refuse ce nom, qui entrerait en
 * collision avec le suffixe des fichiers `.env.local`. Il ne s'appelle pas non
 * plus `development`, qui basculerait `NODE_ENV` et produirait un bundle
 * différent du déployé — or le serveur local sert précisément à tester celui-ci.
 */
const MOCKUPS_MODE = "mockups";
const MOCKUPS_DIR = fileURLToPath(new URL("../../docs/mockups", import.meta.url));
const MOCKUPS_ROUTE = "/mockups";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

/**
 * Résout une URL en fichier du dossier des maquettes, ou `null`.
 *
 * Le `startsWith` n'est pas décoratif : sans lui, `/mockups/../../.env` sortirait
 * du dossier et le serveur de développement servirait n'importe quel fichier du
 * poste.
 */
function resolveWithin(url: string): string | null {
  const path = decodeURIComponent(url.split("?")[0] ?? "/");
  const relative = path === "" || path === "/" ? "index.html" : path.replace(/^\/+/, "");
  const target = resolve(MOCKUPS_DIR, relative);

  if (target !== MOCKUPS_DIR && !target.startsWith(MOCKUPS_DIR + sep)) return null;
  return target;
}

function serveMockups(): Plugin {
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    // Sans la barre finale, `./menu.html` se résoudrait à la racine du site.
    if ((req.originalUrl ?? req.url) === MOCKUPS_ROUTE) {
      res.writeHead(302, { Location: `${MOCKUPS_ROUTE}/` });
      res.end();
      return;
    }

    const file = resolveWithin(req.url ?? "/");
    if (file === null) {
      next();
      return;
    }

    readFile(file)
      .then((body) => {
        res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
        res.end(body);
      })
      .catch(() => next());
  };

  return {
    name: "occulis-mockups-serve",
    apply: "serve",
    configureServer(server) {
      // Posé hors du callback de retour : il doit passer avant le repli SPA de Vite.
      server.middlewares.use(MOCKUPS_ROUTE, handle);
    },
  };
}

function embedMockups(): Plugin {
  let outDir = "";

  return {
    name: "occulis-mockups-embed",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const target = resolve(outDir, "mockups");
      await rm(target, { recursive: true, force: true });
      await cp(MOCKUPS_DIR, target, { recursive: true });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [serveMockups(), ...(mode === MOCKUPS_MODE ? [embedMockups()] : [])],
}));
