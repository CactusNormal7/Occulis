import { readFileSync, writeFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Même détournement que toml.test.ts : le manifeste écrit est un fichier temporaire.
// `listEnvNames` est stubé en plus, car listBranchEnvNames() croise le manifeste avec les
// blocs du wrangler.toml, dont ces tests n'ont pas à dépendre.
const { manifestPath } = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  return {
    manifestPath: join(mkdtempSync(join(tmpdir(), "occulis-manifest-")), "deploy.json"),
  };
});

vi.mock("./config.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./config.js")>()),
  DEPLOY_MANIFEST: manifestPath,
  listEnvNames: (): string[] => ["local", "staging", "production", "feature-orpheline"],
}));

const {
  findDeployEnvironment,
  listBranchEnvNames,
  listDeployEnvironments,
  removeDeployEnvironment,
  upsertDeployEnvironment,
} = await import("./deploy-manifest.js");

const FIXTURE = {
  main: { wranglerEnv: "production", d1Database: "occulis-prod" },
  staging: { wranglerEnv: "staging", d1Database: "occulis-staging" },
  "feature/engine": { wranglerEnv: "feature-engine", d1Database: "occulis-feature-engine" },
};

beforeEach(() => {
  writeFileSync(manifestPath, `${JSON.stringify(FIXTURE, null, 2)}\n`);
});

describe("upsertDeployEnvironment", () => {
  it("distingue création et mise à jour", () => {
    expect(upsertDeployEnvironment("feature/x", "feature-x", "occulis-feature-x")).toBe("created");
    expect(upsertDeployEnvironment("feature/x", "feature-x", "occulis-feature-x")).toBe("updated");
  });

  it("réécrit un JSON indenté et terminé par une nouvelle ligne", () => {
    upsertDeployEnvironment("feature/x", "feature-x", "occulis-feature-x");
    const raw = readFileSync(manifestPath, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).toContain('\n  "feature/x": {');
  });
});

describe("findDeployEnvironment", () => {
  it("résout aussi bien par nom de branche que par slug wrangler", () => {
    const parBranche = findDeployEnvironment("feature/engine");
    const parSlug = findDeployEnvironment("feature-engine");
    expect(parBranche).toEqual(parSlug);
    expect(parBranche?.d1Database).toBe("occulis-feature-engine");
  });

  // Cette résolution est le garde-fou de la production : viser « main » ne donne pas un
  // environnement nommé « main », mais l'entrée production, que isBranchEnv() refuse.
  it("renvoie l'entrée production quand on vise la branche main", () => {
    expect(findDeployEnvironment("main")?.wranglerEnv).toBe("production");
  });

  it("renvoie null pour une cible inconnue", () => {
    expect(findDeployEnvironment("jamais-vue")).toBeNull();
  });
});

describe("listBranchEnvNames", () => {
  it("fait l'union du manifeste et du toml, sans les environnements fixes", () => {
    // feature-engine ne vient que du manifeste, feature-orpheline que du toml : les deux
    // doivent apparaître, sans quoi un environnement à moitié défait serait invisible.
    expect(listBranchEnvNames()).toEqual(["feature-engine", "feature-orpheline"]);
  });

  it("ne compte qu'une fois un environnement présent des deux côtés", () => {
    upsertDeployEnvironment("feature/orpheline", "feature-orpheline", "occulis-feature-orpheline");
    expect(listBranchEnvNames()).toEqual(["feature-engine", "feature-orpheline"]);
  });
});

describe("removeDeployEnvironment", () => {
  it("retire l'entrée et la signale", () => {
    expect(removeDeployEnvironment("feature/engine")).toBe(true);
    expect(findDeployEnvironment("feature/engine")).toBeNull();
    expect(listDeployEnvironments().map((e) => e.branch)).toEqual(["main", "staging"]);
  });

  it("renvoie false quand l'entrée n'existe pas", () => {
    expect(removeDeployEnvironment("feature/jamais-créée")).toBe(false);
    expect(listDeployEnvironments()).toHaveLength(3);
  });
});
