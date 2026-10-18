import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    // `.wrangler/` contient le bundle que `wrangler dev` reconstruit à chaque lancement :
    // du code tiers concaténé, avec ses propres directives eslint pour des règles absentes
    // d'ici. Il est ignoré par git, donc invisible en CI, et faisait échouer `pnpm lint`
    // sur la seule machine qui a lancé le serveur en local.
    // `ds-bundle/` et `.ds-sync/` sont la sortie et les scripts de la synchronisation vers
    // Claude Design (.design-sync/NOTES.md) : du code tiers et généré, ignoré par git, que
    // la CI ne voit jamais.
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.wrangler/**",
      "ds-bundle/**",
      ".ds-sync/**",
      // Doublons de la synchronisation iCloud (voir .gitignore) : jamais des sources.
      "**/* 2.*",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Les règles qui ont besoin des types : une promesse oubliée ou passée là où on
    // attend une fonction synchrone échoue sans bruit — sur un socket ou un gestionnaire
    // de Durable Object, c'est un message perdu. Limité aux sources, que les tsconfig des
    // paquets couvrent ; les fichiers de configuration relèvent de tsconfig.node.json.
    files: ["apps/*/src/**/*.{ts,tsx}", "packages/*/src/**/*.{ts,tsx}", "tooling/*/src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },
  {
    files: ["**/*.tsx", "apps/web/src/**/*.ts", "packages/ui/src/**/*.ts", "tooling/infra/src/**/*.ts"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    // Les frontières de CLAUDE.md, rendues mécaniques : `core` ne dépend de rien ; le
    // protocole ne connaît que `core` ; les modules purs du client ne touchent ni au
    // rendu ni à React (le DOM, lui, ne se voit pas dans les imports).
    files: ["packages/core/src/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ regex: "^[^.]", message: "@occulis/core ne dépend de rien (CLAUDE.md)." }] }],
    },
  },
  {
    files: ["packages/protocol/src/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: "^(?!\\.|@occulis/core$)", message: "Le protocole ne connaît que @occulis/core." }] },
      ],
    },
  },
  {
    files: [
      "apps/web/src/view/**/*.ts",
      "apps/web/src/game/**/*.ts",
      "apps/web/src/net/session.ts",
      "apps/web/src/ui/flow.ts",
      "apps/web/src/load/cache.ts",
      "apps/web/src/admin/model.ts",
      "apps/web/src/admin/replay.ts",
      "apps/web/src/admin/design/catalog.ts",
      "apps/web/src/admin/design/tweaks.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: ["pixi.js", "react", "react-dom"].map((name) => ({ name, message: "Module pur : ni rendu ni React (CLAUDE.md)." })) },
      ],
    },
  },
  {
    // Le code couleur est strict : toute valeur de couleur du projet vit dans
    // packages/ui/src/tokens.ts, et nulle part ailleurs — ni dans le client, ni dans les
    // composants de la charte. La règle rend la contrainte mécanique plutôt que
    // conventionnelle ; les feuilles de style sont gardées par un test du paquet. Le serveur
    // y est soumis aussi : ses courriers HTML portent des couleurs, prises aux tokens.
    // Les aperçus de la charte et la page du labo dessinent du SVG : ils y sont soumis aussi.
    files: [
      "apps/web/src/**/*.{ts,tsx}",
      "apps/web/lab/**/*.ts",
      "apps/server/src/**/*.ts",
      "packages/ui/src/**/*.{ts,tsx}",
      "packages/ui/previews/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[raw=/^0[xX][0-9a-fA-F]{3,8}$/]",
          message: "Couleur en dur : elle doit venir d'un token de packages/ui/src/tokens.ts.",
        },
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message: "Couleur en dur : elle doit venir d'un token de packages/ui/src/tokens.ts.",
        },
      ],
    },
  },
  {
    files: ["packages/ui/src/tokens.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  prettier,
];
