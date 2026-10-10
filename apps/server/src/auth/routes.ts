import { availableProviders, isAdmin, isImpersonated, type Auth } from "./better-auth.js";

/**
 * Ce qui reste des routes d'authentification maintenant que Better Auth les porte :
 * une résolution d'identité pour le reste du Worker, et un seul point d'entrée à nous.
 *
 * `/api/auth/me` survit à la migration alors que la bibliothèque expose déjà
 * `/api/auth/get-session`, parce que les deux ne disent pas la même chose : celle-ci
 * rend le compte entier — identifiants internes, rôle, horodatages — quand le client n'a
 * besoin que du pseudo, de l'adresse, de l'état de vérification et de savoir s'il
 * administre. Une réponse qui n'a pas la donnée ne peut pas la laisser fuiter.
 */
export interface Account {
  readonly userId: string;
  readonly playerId: string;
  readonly handle: string;
  readonly email: string;
  readonly emailVerified: boolean;
  /** Ouvre le lien vers le back-office ; l'accès lui-même est revérifié à chaque appel. */
  readonly admin: boolean;
  /**
   * Vrai quand la session a été ouverte par un administrateur à la place du joueur
   * (greffon `admin`, `impersonate-user`). Le client l'affiche, pour que personne ne
   * joue sous une identité d'emprunt sans le savoir.
   */
  readonly impersonating: boolean;
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
    email: user.email,
    emailVerified: user.emailVerified,
    admin: isAdmin(user.role),
    impersonating: isImpersonated(session.session.impersonatedBy),
  };
}

export async function handleAuth(
  auth: Auth,
  env: Env,
  request: Request,
  path: string,
): Promise<Response | undefined> {
  if (path === "/api/auth/me") {
    // Les fournisseurs proposés sont dits même sans session : c'est l'écran de
    // connexion qui en a besoin, pour afficher ou non « Continuer avec Google ».
    const providers = availableProviders(env);
    const account = await currentAccount(auth, request);
    if (account === undefined) return Response.json({ signedIn: false, providers });
    return Response.json({
      signedIn: true,
      handle: account.handle,
      // L'adresse est rendue au joueur lui-même : c'est elle que le bouton « renvoyer
      // la vérification » réexpédie, et que le formulaire de mot de passe du profil
      // donne comme identifiant aux gestionnaires de mots de passe.
      email: account.email,
      emailVerified: account.emailVerified,
      admin: account.admin,
      impersonating: account.impersonating,
      providers,
    });
  }

  if (path.startsWith("/api/auth/")) return auth.handler(request);
  return undefined;
}
