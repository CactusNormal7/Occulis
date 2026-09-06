import { defineWorkersProject, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

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

export default defineWorkersProject({
  test: {
    setupFiles: ["./src/test-setup.ts"],
    poolOptions: {
      workers: {
        singleWorker: true,
        // L'isolation du stockage entre tests ne sait pas manipuler un Durable Object
        // adossé à SQLite (`new_sqlite_classes`) dans cette version du pool. Sans
        // conséquence ici : chaque test crée sa propre partie, avec un identifiant tiré
        // au hasard, donc aucun ne lit ce qu'un autre a écrit.
        isolatedStorage: false,
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            // Better Auth refuse de démarrer sans secret. Sa valeur n'a pas
            // d'importance ici : aucun cookie ne survit à la fin de la suite.
            AUTH_SECRET: "PmVq7xK2sLd9RtYw4NbHj6ZcAe3Fg8Uk1QoXiMrTvBn5",
          },
        },
      },
    },
  },
});
