import { type D1Migration, applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

/**
 * Applique les migrations réelles à la base de test avant chaque fichier de test. Elles
 * sont lues par `vitest.config.ts` et passées en binding : le schéma testé est celui qui
 * est déployé, pas une copie qui dériverait.
 */
type WorkerEnv = Env;

/**
 * Le type de `env` et de `exports` (`cloudflare:workers`) dans les tests : les liaisons
 * du Worker plus les migrations, et son module principal, dont `exports.default` appelle
 * le gestionnaire `fetch`.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- forme imposée par les types de Workers
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      readonly TEST_MIGRATIONS: D1Migration[];
    }
    interface GlobalProps {
      mainModule: typeof import("./index.js");
    }
  }
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
