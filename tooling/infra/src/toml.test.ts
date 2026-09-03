import { readFileSync, writeFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// toml.ts écrit dans le fichier désigné par `config.TOML`. Les tests le détournent vers
// un fichier temporaire : ils exercent ainsi le vrai code d'édition, écriture comprise,
// sans que le wrangler.toml du dépôt ne serve de bac à sable.
// vi.hoisted remonte au-dessus des imports statiques : le chemin doit donc être calculé
// avec des imports dynamiques, sinon il référence des liaisons pas encore initialisées.
const { tomlPath } = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  return { tomlPath: join(mkdtempSync(join(tmpdir(), "occulis-toml-")), "wrangler.toml") };
});

vi.mock("./config.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./config.js")>()),
  TOML: tomlPath,
}));

const { appendEnvBlock, configuredDatabaseId, envBlockExists, patchDatabaseId, removeEnvBlock } =
  await import("./toml.js");

const FIXTURE = `name = "occulis"
main = "src/index.ts"

[[d1_databases]]
binding = "DB"
database_name = "occulis-local"
database_id = "local-id"

[env.staging]
name = "occulis-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "occulis-staging"
database_id = "staging-id"

[env.production]
name = "occulis"

[[env.production.d1_databases]]
binding = "DB"
database_name = "occulis-prod"
database_id = "prod-id"
`;

const read = (): string => readFileSync(tomlPath, "utf8");

beforeEach(() => {
  writeFileSync(tomlPath, FIXTURE);
});

describe("envBlockExists", () => {
  it("distingue un bloc présent d'un bloc absent", () => {
    expect(envBlockExists("staging")).toBe(true);
    expect(envBlockExists("feature-x")).toBe(false);
  });
});

describe("appendEnvBlock", () => {
  it("génère un bloc complet : route, assets, Durable Object et base", () => {
    appendEnvBlock("feature-x", "occulis-feature-x");
    const toml = read();
    expect(toml).toContain("[env.feature-x]");
    expect(toml).toContain('pattern = "occulis-feature-x.0kl.fr", custom_domain = true');
    expect(toml).toContain("[env.feature-x.assets]");
    expect(toml).toContain("[[env.feature-x.durable_objects.bindings]]");
    expect(toml).toContain('database_name = "occulis-feature-x"');
    // Sans base créée, l'identifiant reste un placeholder : c'est lui que
    // guardPlaceholder() attend pour refuser migrations et déploiement.
    expect(configuredDatabaseId("feature-x")).toBe("REMPLACER_PAR_L_ID");
  });

  it("est idempotent", () => {
    appendEnvBlock("feature-x", "occulis-feature-x");
    const once = read();
    appendEnvBlock("feature-x", "occulis-feature-x");
    expect(read()).toBe(once);
  });
});

describe("removeEnvBlock", () => {
  it("annule exactement appendEnvBlock", () => {
    appendEnvBlock("feature-x", "occulis-feature-x");
    expect(removeEnvBlock("feature-x")).toBe(true);
    expect(read()).toBe(FIXTURE);
  });

  it("renvoie false quand le bloc n'existe pas", () => {
    expect(removeEnvBlock("jamais-créé")).toBe(false);
    expect(read()).toBe(FIXTURE);
  });

  it("ne mange pas le bloc suivant", () => {
    appendEnvBlock("feature-a", "occulis-feature-a");
    appendEnvBlock("feature-b", "occulis-feature-b");
    removeEnvBlock("feature-a");
    expect(envBlockExists("feature-a")).toBe(false);
    expect(envBlockExists("feature-b")).toBe(true);
    expect(read()).toContain('database_name = "occulis-feature-b"');
    expect(envBlockExists("staging")).toBe(true);
    expect(envBlockExists("production")).toBe(true);
  });
});

describe("patchDatabaseId", () => {
  it("n'écrit que sous le bloc visé", () => {
    patchDatabaseId("staging", "nouvel-id");
    expect(configuredDatabaseId("staging")).toBe("nouvel-id");
    expect(configuredDatabaseId("production")).toBe("prod-id");
    expect(configuredDatabaseId("local")).toBe("local-id");
  });

  it("échoue bruyamment si le bloc n'existe pas", () => {
    expect(() => patchDatabaseId("feature-x", "id")).toThrow();
  });
});

describe("configuredDatabaseId", () => {
  it("lit le bloc non préfixé pour local", () => {
    expect(configuredDatabaseId("local")).toBe("local-id");
  });

  it("renvoie null pour un environnement inconnu", () => {
    expect(configuredDatabaseId("feature-x")).toBeNull();
  });
});
