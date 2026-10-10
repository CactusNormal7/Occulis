/**
 * Les anciennes adresses françaises (`/connexion`, `/profil/`, `?verifiee=1`…), passées en
 * anglais avec le reste du nommage (CLAUDE.md, conventions). Elles ne disparaissent pas
 * pour autant : des courriers déjà envoyés les portent — liens de vérification et de
 * réinitialisation, dont Better Auth renvoie vers l'adresse de retour qu'ils contiennent.
 * Elles redirigent donc, définitivement, vers leur équivalent.
 *
 * Le fragment (`#securite`) n'atteint jamais le serveur ; le navigateur le reporte de
 * lui-même sur l'adresse de destination, et la page de profil le lit encore.
 */
const PATHS: Readonly<Record<string, string>> = {
  "/connexion": "/sign-in",
  "/inscription": "/sign-up",
  "/mot-de-passe-oublie": "/forgot-password",
  "/reinitialiser": "/reset-password",
  "/profil": "/profile/",
  "/profil/": "/profile/",
};

const PARAMETERS: Readonly<Record<string, string>> = {
  verifiee: "verified",
  supprime: "deleted",
  lie: "linked",
  bienvenue: "welcome",
};

/** L'adresse vers laquelle rediriger, ou `undefined` si celle-ci n'est pas une ancienne adresse. */
export function legacyRedirect(url: URL): string | undefined {
  const path = PATHS[url.pathname];
  const renamed = [...url.searchParams.keys()].some((key) => Object.hasOwn(PARAMETERS, key));
  if (path === undefined && !renamed) return undefined;

  const target = new URL(path ?? url.pathname, url.origin);
  for (const [key, value] of url.searchParams) target.searchParams.append(PARAMETERS[key] ?? key, value);
  return target.toString();
}
