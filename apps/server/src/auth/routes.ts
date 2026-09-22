import type { Auth } from "./better-auth.js";

/**
 * Ce qui reste des routes d'authentification maintenant que Better Auth les porte :
 * une résolution d'identité pour le reste du Worker, et un seul point d'entrée à nous.
 *
 * `/api/auth/me` survit à la migration alors que la bibliothèque expose déjà
 * `/api/auth/get-session`, parce que les deux ne disent pas la même chose : celle-ci
 * rend le compte entier — identifiant interne, adresse, profil — quand le client n'a
 * besoin que du pseudo et de l'état de vérification. Une réponse qui n'a pas la donnée
 * ne peut pas la laisser fuiter.
 */
export interface Account {
  readonly userId: string;
  readonly playerId: string;
  readonly handle: string;
  readonly emailVerified: boolean;
}

export async function currentAccount(auth: Auth, request: Request): Promise<Account | undefined> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session === null) return undefined;

  const { user } = session;
  // Un compte sans profil ne devrait pas exister — le crochet d'inscription crée les
  // deux ensemble — mais rien dans le schéma ne l'interdit, et le reste du Worker
  // suppose un `playerId`. Mieux vaut ne reconnaître personne que rendre un compte
  // dont l'identifiant de joueur serait vide.
  if (typeof user.playerId !== "string" || user.playerId.length === 0) return undefined;

  return {
    userId: user.id,
    playerId: user.playerId,
    handle: user.name,
    emailVerified: user.emailVerified,
  };
}

export async function handleAuth(
  auth: Auth,
  request: Request,
  path: string,
): Promise<Response | undefined> {
  if (path === "/api/auth/me") {
    const account = await currentAccount(auth, request);
    if (account === undefined) return Response.json({ signedIn: false });
    return Response.json({
      signedIn: true,
      handle: account.handle,
      emailVerified: account.emailVerified,
    });
  }

  if (path.startsWith("/api/auth/")) return auth.handler(request);
  return undefined;
}
