import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  {
    // `.wrangler/` contient le bundle que `wrangler dev` reconstruit à chaque lancement :
    // du code tiers concaténé, avec ses propres directives eslint pour des règles absentes
    // d'ici. Il est ignoré par git, donc invisible en CI, et faisait échouer `pnpm lint`
    // sur la seule machine qui a lancé le serveur en local.
    // `ds-bundle/` et `.ds-sync/` sont la sortie et les scripts de la synchronisation vers
    // Claude Design (.design-sync/NOTES.md) : du code tiers et généré, ignoré par git, que
    // la CI ne voit jamais.
    ignores: ["**/dist/**", "**/node_modules/**", "**/.wrangler/**", "ds-bundle/**", ".ds-sync/**"],
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
    // Le code couleur est strict : toute valeur de couleur du projet vit dans
    // packages/ui/src/tokens.ts, et nulle part ailleurs — ni dans le client, ni dans les
    // composants de la charte. La règle rend la contrainte mécanique plutôt que
    // conventionnelle ; les feuilles de style sont gardées par un test du paquet. Le serveur
    // y est soumis aussi : ses courriers HTML portent des couleurs, prises aux tokens.
    files: ["apps/web/src/**/*.{ts,tsx}", "apps/server/src/**/*.ts", "packages/ui/src/**/*.{ts,tsx}"],
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
