import { describe, expect, it } from "vitest";
import { dbName, envFlag, isBranchEnv, slugifyBranch } from "./config.js";

describe("dbName", () => {
  it("garde les noms fixes des trois environnements permanents", () => {
    expect(dbName("local")).toBe("occulis-local");
    expect(dbName("staging")).toBe("occulis-staging");
    expect(dbName("production")).toBe("occulis-prod");
  });

  it("préfixe tout le reste", () => {
    expect(dbName("feature-engine")).toBe("occulis-feature-engine");
  });
});

describe("isBranchEnv", () => {
  // C'est ce prédicat, et lui seul, qui empêche « Supprimer un environnement de
  // branche » de détruire la production ou la recette.
  it("refuse les trois environnements fixes", () => {
    expect(isBranchEnv("local")).toBe(false);
    expect(isBranchEnv("staging")).toBe(false);
    expect(isBranchEnv("production")).toBe(false);
  });

  it("accepte tout environnement de branche", () => {
    expect(isBranchEnv("feature-engine")).toBe(true);
    // « main » est un nom de branche, pas un nom d'environnement wrangler : il n'est
    // pas protégé ici mais par la résolution du manifeste, qui le renvoie sur
    // « production » avant que ce prédicat ne soit consulté.
    expect(isBranchEnv("main")).toBe(true);
  });
});

describe("slugifyBranch", () => {
  it("remplace toutes les barres obliques", () => {
    expect(slugifyBranch("feature/engine")).toBe("feature-engine");
    expect(slugifyBranch("claude/fix/deep")).toBe("claude-fix-deep");
  });

  it("laisse intact un nom sans barre oblique", () => {
    expect(slugifyBranch("staging")).toBe("staging");
  });
});

describe("envFlag", () => {
  // Les bindings ne sont pas hérités : oublier --env fait travailler wrangler sur
  // la configuration par défaut, donc sur occulis-local.
  it("ne passe --env que pour les environnements nommés", () => {
    expect(envFlag("local")).toEqual([]);
    expect(envFlag("production")).toEqual(["--env", "production"]);
  });
});
