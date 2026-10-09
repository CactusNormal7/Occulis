import { describe, expect, it } from "vitest";
import { legacyRedirect } from "./legacy-routes.js";

const at = (path: string) => legacyRedirect(new URL(path, "https://occulis.test"));

describe("legacyRedirect", () => {
  it("renvoie les parcours de compte vers leur nom anglais", () => {
    expect(at("/connexion")).toBe("https://occulis.test/sign-in");
    expect(at("/inscription")).toBe("https://occulis.test/sign-up");
    expect(at("/mot-de-passe-oublie")).toBe("https://occulis.test/forgot-password");
  });

  it("garde le jeton d'un lien de réinitialisation déjà envoyé", () => {
    expect(at("/reinitialiser?token=abc")).toBe("https://occulis.test/reset-password?token=abc");
  });

  it("renomme les paramètres de retour, sur l'ancienne page comme sur l'accueil", () => {
    expect(at("/?verifiee=1")).toBe("https://occulis.test/?verified=1");
    expect(at("/connexion?supprime=1")).toBe("https://occulis.test/sign-in?deleted=1");
    expect(at("/profil/?lie=google")).toBe("https://occulis.test/profile/?linked=google");
    expect(at("/profil/?bienvenue=1")).toBe("https://occulis.test/profile/?welcome=1");
  });

  it("ne touche pas aux adresses actuelles", () => {
    expect(at("/")).toBeUndefined();
    expect(at("/sign-in?error=access_denied")).toBeUndefined();
    expect(at("/profile/")).toBeUndefined();
  });
});
