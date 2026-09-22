import { applyD1Migrations, env } from "cloudflare:test";

/**
 * Applique les migrations réelles à la base de test avant toute suite. Elles sont
 * lues par `vitest.config.ts` et passées en binding : le schéma testé est celui qui
 * est déployé, pas une copie qui dériverait.
 */
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    readonly TEST_MIGRATIONS: D1Migration[];
  }
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
