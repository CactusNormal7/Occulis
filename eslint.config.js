import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  {
    // `.wrangler/` contient le bundle que `wrangler dev` reconstruit à chaque lancement :
    // du code tiers concaténé, avec ses propres directives eslint pour des règles absentes
    // d'ici. Il est ignoré par git, donc invisible en CI, et faisait échouer `pnpm lint`
    // sur la seule machine qui a lancé le serveur en local.
    ignores: ["**/dist/**", "**/node_modules/**", "**/.wrangler/**"],
  },
  {
    files: ["**/*.ts"],
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
    // Le code couleur est strict : toute valeur de couleur du client vit dans
    // src/theme.ts, et nulle part ailleurs. La règle rend la contrainte
    // mécanique plutôt que conventionnelle.
    files: ["apps/web/src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[raw=/^0[xX][0-9a-fA-F]{3,8}$/]",
          message: "Couleur en dur : elle doit venir d'un token de apps/web/src/theme.ts.",
        },
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message: "Couleur en dur : elle doit venir d'un token de apps/web/src/theme.ts.",
        },
      ],
    },
  },
  {
    files: ["apps/web/src/theme.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  prettier,
];
