import { mkdirSync } from "node:fs";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

/**
 * Les tests du serveur tournent dans **workerd**, le runtime réel, et non sous Node.
 *
 * C'est la seule façon d'éprouver ce qui distingue vraiment ce serveur : que les
 * Durable Objects reçoivent réellement leurs messages, que l'hibernation soit possible,
 * et que D1 accepte les écritures — la contrainte de clé étrangère de `matches` avait
 * cassé la création de partie sans qu'aucun test unitaire ne bronche.
 *
 * Les migrations sont lues ici, côté Node, puis appliquées à la base de test : ce sont
 * **les vraies**, donc le schéma testé ne peut pas dériver de celui qui est déployé.
 */
const migrations = await readD1Migrations("./migrations");

// Le plugin fait lire `wrangler.toml` par wrangler, qui refuse de démarrer si le dossier
// d'`[assets]` est absent — or il est produit par le build du client, qui ne précède pas
// les tests (ni en CI, ni sur un dépôt fraîchement cloné). Aucun test ne sert d'asset :
// le dossier n'a qu'à exister.
mkdirSync("../web/dist", { recursive: true });

export default defineConfig({
  plugins: [
    // Le stockage — D1 comme celui des Durable Objects — est isolé par fichier de test ;
    // à l'intérieur d'un fichier, chaque test crée ses propres comptes et parties, avec
    // des identifiants tirés au hasard, donc aucun ne lit ce qu'un autre a écrit.
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          // Better Auth refuse de démarrer sans secret. Sa valeur n'a pas
          // d'importance ici : aucun cookie ne survit à la fin de la suite.
          AUTH_SECRET: "PmVq7xK2sLd9RtYw4NbHj6ZcAe3Fg8Uk1QoXiMrTvBn5",
          // Aucun appel réseau sortant depuis la suite : le contrôle des fuites a ses
          // propres tests, sur un `fetch` simulé (`password.test.ts`).
          PASSWORD_BREACH_CHECK: "off",
          // Le plugin lit aussi `.dev.vars` : sans ces valeurs vides, les secrets Google d'un
          // poste de développement changeraient ce que la suite observe (`providers`).
          GOOGLE_CLIENT_ID: "",
          GOOGLE_CLIENT_SECRET: "",
          OAUTH_PROXY_URL: "",
          OAUTH_PROXY_SECRET: "",
        },
      },
    }),
  ],
  test: {
    setupFiles: ["./src/test-setup.ts"],
  },
});
