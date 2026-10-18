import { cp, readFile, rm } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Connect, type Plugin } from "vite";
// Par chemin relatif et non par `@occulis/ui/critical` : Vite laisse les imports nus de sa
// configuration à Node, qui ne sait pas lire le TypeScript du paquet ; un chemin relatif
// est, lui, empaqueté avec la configuration.
import { withCriticalHead } from "../../packages/ui/src/critical.js";

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

/**
 * Place en tête de chaque page le bloc qui décide de la première image peinte : fond,
 * thème sombre, fondu entre pages et préchargement (`@occulis/ui/critical`). En tête
 * plutôt qu'à la suite : il doit précéder la feuille et le script que Vite injecte, sans
 * quoi le navigateur peindrait en blanc le temps de les charger.
 */
function criticalPaint(): Plugin {
  return {
    name: "occulis-critical-paint",
    transformIndexHtml: {
      order: "pre",
      handler: (html) => withCriticalHead(html),
    },
  };
}

/**
 * Trois pages : le jeu, le back-office sous `/admin/` et le profil sous `/profile/`.
 * Séparées pour que les deux dernières ne chargent ni Pixi ni le moteur, et que le jeu
 * n'embarque rien d'elles.
 */
const PAGES = {
  main: fileURLToPath(new URL("index.html", import.meta.url)),
  admin: fileURLToPath(new URL("admin/index.html", import.meta.url)),
  profile: fileURLToPath(new URL("profile/index.html", import.meta.url)),
};

/**
 * Le design system du back-office (`src/admin/design/`) monte les aperçus de la charte là
 * où la synchronisation vers Claude Design les range, dans `.design-sync/previews/`, hors
 * de tout paquet : aucun `node_modules` ni `tsconfig.json` ne les y attend. D'où trois
 * réglages, sans effet sur le reste du client :
 * - `@occulis/ui` et React se résolvent depuis cette application (`alias`, `dedupe`) —
 *   un second React casserait les hooks ;
 * - le JSX est compilé par le runtime automatique, celui que `"jsx": "react-jsx"` impose
 *   déjà à `src/`.
 */
const UI_ENTRY = fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url));

/**
 * Le labo de la refonte graphique (`lab/`, qui monte `packages/ui/previews/`) : comme les
 * maquettes, servi par le serveur de développement (Vite sert toute page HTML de sa racine)
 * et ajouté au build sous le seul mode `mockups`. `pnpm build`, donc tout déploiement, ne
 * l'embarque pas.
 */
const LAB_PAGE = fileURLToPath(new URL("lab/index.html", import.meta.url));
const LAB_ROUTE = "/lab";

/**
 * `/lab` sans barre finale n'est pas une page pour Vite : son repli SPA y servirait le jeu,
 * dont l'écran reste noir sans serveur derrière. On redirige vers `/lab/`, comme `/mockups`.
 */
function redirectLab(): Plugin {
  return {
    name: "occulis-lab-redirect",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? "").split("?")[0] !== LAB_ROUTE) {
          next();
          return;
        }
        res.writeHead(302, { Location: `${LAB_ROUTE}/` });
        res.end();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    criticalPaint(),
    serveMockups(),
    redirectLab(),
    ...(mode === MOCKUPS_MODE ? [embedMockups()] : []),
  ],
  resolve: {
    alias: [{ find: /^@occulis\/ui$/, replacement: UI_ENTRY }],
    dedupe: ["react", "react-dom"],
  },
  esbuild: { jsx: "automatic" },
  build: { rollupOptions: { input: mode === MOCKUPS_MODE ? { ...PAGES, lab: LAB_PAGE } : PAGES } },
}));
