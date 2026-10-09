import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { admin, oAuthProxy } from "better-auth/plugins";
import { DEFAULT_LOCALE, type Locale } from "@occulis/i18n";
import { anonymousHandle, checkHandle, handleCandidates } from "./handle.js";
import { MIN_PASSWORD_LENGTH, breachedPassword, hashPassword, verifyPassword } from "./password.js";
import {
  changeEmailLetter,
  deleteAccountLetter,
  passwordChangedLetter,
  providerLinkedLetter,
  resetLetter,
  sendLetter,
  verificationLetter,
} from "./mail.js";

/**
 * La configuration Better Auth. Elle tourne **dans le Worker**, sur la base D1 du
 * projet : aucun tiers ne détient l'identité, et rien n'est facturé à l'utilisateur
 * actif (docs/architecture.md section 7).
 *
 * Trois choix méritent d'être explicités, parce qu'ils s'écartent des réglages par
 * défaut de la bibliothèque :
 *
 * - **Le hachage reste le nôtre.** `password.ts` (PBKDF2-HMAC-SHA256, 210 000 tours)
 *   est branché tel quel, donc aucune empreinte existante n'est invalidée et le format
 *   `pbkdf2-sha256$…` reste lisible. Better Auth utiliserait scrypt sinon, ce qui aurait
 *   imposé de réencoder chaque mot de passe à la prochaine connexion.
 * - **Le compte et le profil de jeu restent deux choses distinctes.** Better Auth
 *   possède `users` ; `players` continue de porter le pseudo affiché et l'ELO, et le
 *   lien est le champ `playerId`, créé par le crochet ci-dessous. Rien dans la
 *   bibliothèque n'a besoin de connaître `players`.
 * - **L'instance est construite par requête.** Les bindings n'existent que dans
 *   `fetch`, et l'URL de base doit valoir celle par laquelle on est joint, sans quoi
 *   les liens envoyés par courrier pointeraient vers le mauvais environnement.
 */
/**
 * `locale` est la langue de la requête (cookie de choix, sinon `Accept-Language`) : c'est
 * elle que parlent les courriers qu'elle déclenche. L'objet étant construit par requête,
 * aucun courrier ne part dans la langue d'un autre joueur.
 */
export function buildAuth(env: Env, origin: string, locale: Locale = DEFAULT_LOCALE) {
  return betterAuth({
    plugins: [
      // Le back-office (docs/technical/server.md, « `admin/` »). Le greffon ajoute le
      // rôle et le bannissement au compte, et l'usurpation à la session ; les noms de
      // colonnes suivent la convention du schéma, comme pour les tables ci-dessous.
      admin({
        defaultRole: "user",
        adminRoles: [ADMIN_ROLE],
        // Une session d'emprunt dure une heure, puis tombe d'elle-même : l'oublier ouverte
        // ne doit pas laisser un administrateur jouer indéfiniment sous un autre nom.
        // Usurper un autre administrateur reste refusé (réglage par défaut du greffon).
        impersonationSessionDuration: 60 * 60,
        schema: {
          user: {
            fields: { banReason: "ban_reason", banExpires: "ban_expires" },
          },
          session: { fields: { impersonatedBy: "impersonated_by" } },
        },
      }),
      ...oauthProxyPlugin(env),
    ],

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // Le pseudo vit deux fois — `users.name` pour Better Auth, `players.handle` pour
        // le jeu, qui en tient l'unicité — et les routes de mise à jour de la
        // bibliothèque n'écriraient que le premier. Le renommage passe donc par
        // `POST /api/me/handle` ou `POST /api/admin/players/:id/handle`, qui écrivent
        // les deux d'un coup.
        if (ctx.path === "/update-user" || ctx.path === "/admin/update-user") {
          const body = ctx.body as { name?: unknown; data?: { name?: unknown } } | undefined;
          if (body?.name !== undefined || body?.data?.name !== undefined) {
            throw new APIError("BAD_REQUEST", { message: "handle-readonly", code: "HANDLE_READONLY" });
          }
        }

        // Une session d'emprunt sert à **voir** ce que voit le joueur, pas à agir sur
        // son compte : l'administrateur qui usurpe ne doit pas pouvoir changer le mot
        // de passe, l'adresse, les connexions ou supprimer le compte de quelqu'un
        // d'autre. Le même refus est tenu par `me/routes.ts` pour les routes du projet.
        if (ctx.path !== undefined && ACCOUNT_MUTATIONS.has(ctx.path)) {
          const session = await getSessionFromCtx(ctx);
          if (isImpersonated(session?.session.impersonatedBy)) {
            throw new APIError("FORBIDDEN", { message: "impersonation-readonly", code: "IMPERSONATION_READONLY" });
          }
        }

        const candidate = ctx.path === undefined ? undefined : newPasswordOf(ctx.path, ctx.body);
        if (candidate !== undefined && env.PASSWORD_BREACH_CHECK !== "off") {
          // `undefined` (service injoignable) laisse passer : voir `breachedPassword`.
          if ((await breachedPassword(candidate)) === true) {
            throw new APIError("BAD_REQUEST", { message: "password-compromised", code: "PASSWORD_COMPROMISED" });
          }
        }

        // Changer de mot de passe ferme toujours les autres sessions, quoi que demande
        // le client : c'est le geste de qui pense son compte compromis, et une option
        // oubliée le rendrait sans effet.
        if (ctx.path === "/change-password") {
          return { context: { body: { ...(ctx.body as object), revokeOtherSessions: true } } };
        }
      }),

      after: createAuthMiddleware(async (ctx) => {
        // Un avis à l'adresse du compte après chaque changement de mot de passe réussi :
        // si ce n'était pas le joueur, c'est par là qu'il l'apprend.
        if (ctx.path !== "/change-password" || isAPIError(ctx.context.returned)) return;
        const email = (ctx.context.returned as { user?: { email?: unknown } } | undefined)?.user?.email;
        if (typeof email === "string") await sendLetter(env, passwordChangedLetter(locale, email, securityUrl(origin)));
      }),
    },

    database: env.DB,
    baseURL: origin,
    secret: env.AUTH_SECRET,

    session: {
      modelName: "sessions",
      // Sept jours **d'inactivité** : `updateAge` repousse l'échéance à chaque journée
      // d'usage, donc un joueur régulier ne se reconnecte jamais. Plus court que les
      // trente jours de l'implémentation précédente, et délibérément : le jeton est
      // désormais stocké en clair, une session dormante ne doit pas traîner un mois.
      expiresIn: 7 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
      },
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      // Vérifier l'adresse n'est pas exigé pour se connecter, mais pour entrer dans la
      // file d'attente (voir `index.ts`) : un compte reste utilisable tant que le
      // message n'est pas arrivé, sans que le jeu classé s'ouvre aux adresses jetables.
      requireEmailVerification: false,
      password: {
        hash: hashPassword,
        verify: ({ password, hash }) => verifyPassword(password, hash),
      },
      sendResetPassword: async ({ user, url }) => {
        await sendLetter(env, resetLetter(locale, user.email, url));
      },
      // Qui réinitialise reprend la main sur le compte : toute session ouverte avant —
      // peut-être celle de quelqu'un qui connaissait l'ancien mot de passe — tombe.
      revokeSessionsOnPasswordReset: true,
    },

    socialProviders: socialProviders(env),

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendLetter(env, verificationLetter(locale, user.email, url));
      },
    },

    account: {
      modelName: "accounts",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      // Liaison automatique : se connecter avec Google sur une adresse qui a déjà un
      // compte rattache Google à ce compte au lieu d'échouer. Deux garde-fous, ceux de
      // la bibliothèque, et c'est pour eux que Google n'est **pas** déclaré en
      // `trustedProviders` (ce qui les lèverait) :
      // - Google doit affirmer l'adresse vérifiée (`email_verified`) ;
      // - le compte local doit l'être aussi (`requireLocalEmailVerified`, par défaut).
      //   Sans lui, quelqu'un pourrait inscrire votre adresse avec son mot de passe, et
      //   récupérer votre compte le jour où vous arriveriez par Google.
      // Délier la dernière méthode de connexion reste refusé (`allowUnlinkingAll`).
      accountLinking: { enabled: true },
    },

    // Le compteur vit en base : la mémoire d'une isolate Worker ne survit pas d'une
    // requête à l'autre, donc un stockage mémoire ne limiterait rien du tout.
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rate_limits",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 3600, max: 5 },
        // `/forget-password` jusqu'à la 1.7, où la route a été renommée : la règle
        // portait sur un chemin qui n'existait plus, et la réinitialisation retombait
        // sur la limite générale de cent par minute.
        "/request-password-reset": { window: 3600, max: 3 },
        "/reset-password": { window: 3600, max: 10 },
        "/send-verification-email": { window: 3600, max: 5 },
        "/change-password": { window: 900, max: 5 },
        "/change-email": { window: 3600, max: 5 },
        "/delete-user": { window: 3600, max: 3 },
        "/sign-in/social": { window: 60, max: 20 },
        "/link-social": { window: 3600, max: 10 },
      },
    },

    user: {
      modelName: "users",
      fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" },
      additionalFields: {
        // `input: false` : le lien vers le profil est posé par le serveur, jamais
        // accepté depuis le corps d'une requête d'inscription.
        playerId: { type: "string", required: false, input: false, fieldName: "player_id" },
      },
      // Changer d'adresse exige l'accord de l'**ancienne** (un lien qui lui est envoyé),
      // puis la vérification de la nouvelle : une session volée ne suffit pas à
      // détourner le compte vers une adresse de l'attaquant. Une adresse déjà prise
      // reçoit la même réponse qu'une libre (comportement de la bibliothèque).
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          await sendLetter(env, changeEmailLetter(locale, user.email, newEmail, url));
        },
      },
      // La suppression passe toujours par un lien envoyé à l'adresse du compte : c'est
      // la seule preuve qui vaille aussi bien pour un compte Google sans mot de passe.
      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification: async ({ user, url }) => {
          await sendLetter(env, deleteAccountLetter(locale, user.email, url));
        },
      },
    },
    verification: {
      modelName: "verifications",
      fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" },
    },

    databaseHooks: {
      user: {
        create: {
          // Le profil est créé **avant** le compte, et son identifiant retourné avec la
          // ligne : un pseudo déjà pris doit faire échouer l'inscription entière, pas
          // laisser derrière lui un compte sans profil.
          before: async (user, ctx) => {
            const playerId = crypto.randomUUID();
            const handle = isProviderSignUp(ctx?.path)
              ? await claimDerivedHandle(env.DB, playerId, user.name)
              : await claimHandle(env.DB, playerId, user.name);
            return { data: { ...user, name: handle, playerId } };
          },
        },
        delete: {
          // Le profil survit au compte : les logs de parties le référencent et doivent
          // rester rejouables pour l'adversaire. Mais plus rien ne doit y rattacher la
          // personne, donc son pseudo est remplacé. Vaut pour la suppression par le
          // joueur comme par un administrateur.
          before: async (user) => {
            const row = await env.DB.prepare("SELECT player_id FROM users WHERE id = ?")
              .bind(user.id)
              .first<{ player_id: string | null }>();
            if (row?.player_id) {
              await env.DB.prepare("UPDATE players SET handle = ?, handle_changed_at = ? WHERE id = ?")
                .bind(anonymousHandle(row.player_id), Date.now(), row.player_id)
                .run();
            }
          },
        },
      },
      account: {
        create: {
          // Un fournisseur ajouté à un compte **existant** (liaison automatique ou depuis
          // le profil) mérite un avis : c'est une nouvelle porte d'entrée sur le compte.
          // Rien à signaler pour celui qui vient de créer le compte.
          after: async (account) => {
            if (account.providerId === "credential") return;
            const owner = await env.DB.prepare("SELECT email, created_at FROM users WHERE id = ?")
              .bind(account.userId)
              .first<{ email: string; created_at: string }>();
            if (owner === null || Date.now() - Date.parse(owner.created_at) < FRESH_ACCOUNT_MS) return;
            await sendLetter(env, providerLinkedLetter(locale, owner.email, providerLabel(account.providerId), securityUrl(origin)));
          },
        },
      },
    },

    advanced: {
      // Garde le nom de cookie du projet plutôt que `better-auth.*`, qui nommerait la
      // bibliothèque dans quelque chose que l'utilisateur voit.
      cookiePrefix: "occulis",
      defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "lax" },
      // La limitation de débit compte par adresse IP, et `CF-Connecting-IP` est posé
      // par la bordure Cloudflare, qui écrase ce que le client aurait mis : contrairement
      // à `X-Forwarded-For`, il ne se falsifie donc pas pour se donner un seau neuf.
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
  });
}

export type Auth = ReturnType<typeof buildAuth>;

/** Le seul rôle qui ouvre le back-office. Tout autre compte porte le rôle `user`. */
export const ADMIN_ROLE = "admin";

/** Better Auth range plusieurs rôles séparés par des virgules dans la même colonne. */
export function isAdmin(role: string | null | undefined): boolean {
  return (role ?? "").split(",").some((entry) => entry.trim() === ADMIN_ROLE);
}

/**
 * Les routes de Better Auth qui modifient le compte de la session. Refusées à une
 * session d'emprunt (`hooks.before`).
 */
const ACCOUNT_MUTATIONS = new Set([
  "/update-user",
  "/change-password",
  "/set-password",
  "/change-email",
  "/delete-user",
  "/delete-user/callback",
  "/link-social",
  "/unlink-account",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
]);

export function isImpersonated(impersonatedBy: unknown): boolean {
  return typeof impersonatedBy === "string" && impersonatedBy.length > 0;
}

/** Le nouveau mot de passe que porte une requête, pour le contrôle des fuites. */
function newPasswordOf(path: string, body: unknown): string | undefined {
  const fields = (body ?? {}) as { password?: unknown; newPassword?: unknown };
  const value = path === "/sign-up/email" ? fields.password : PASSWORD_CHANGES.has(path) ? fields.newPassword : undefined;
  return typeof value === "string" && value.length >= MIN_PASSWORD_LENGTH ? value : undefined;
}

const PASSWORD_CHANGES = new Set(["/change-password", "/reset-password"]);

/** Un compte créé par le retour d'un fournisseur d'identité, et non par le formulaire. */
function isProviderSignUp(path: string | undefined): boolean {
  return path !== undefined && (path.startsWith("/callback/") || path === "/oauth-proxy-callback");
}

/** Pseudo choisi au formulaire : il est valide et libre, ou l'inscription échoue. */
async function claimHandle(db: D1Database, playerId: string, raw: string): Promise<string> {
  const checked = checkHandle(raw);
  if (!checked.ok) {
    // Un `code` explicite : le client traduit sur lui, jamais sur la phrase, qui n'est
    // pas un contrat.
    throw new APIError("BAD_REQUEST", { message: checked.code, code: checked.code });
  }
  if (!(await insertPlayer(db, playerId, checked.handle))) {
    throw new APIError("UNPROCESSABLE_ENTITY", { message: "handle-taken", code: "HANDLE_TAKEN" });
  }
  return checked.handle;
}

/**
 * Pseudo dérivé du nom affiché par le fournisseur : le premier candidat libre. Un compte
 * Google ne doit jamais échouer pour un pseudo qu'il n'a pas choisi ; le joueur le
 * changera depuis son profil.
 */
async function claimDerivedHandle(db: D1Database, playerId: string, displayName: string): Promise<string> {
  const random = (): string => crypto.randomUUID().replace(/-/g, "").slice(0, 4);
  for (const handle of handleCandidates(displayName, random)) {
    if (await insertPlayer(db, playerId, handle)) return handle;
  }
  throw new APIError("INTERNAL_SERVER_ERROR", { message: "handle-exhausted", code: "HANDLE_EXHAUSTED" });
}

/** Faux si le pseudo est déjà pris, à la casse près (index `players_handle_nocase`). */
async function insertPlayer(db: D1Database, playerId: string, handle: string): Promise<boolean> {
  try {
    await db.prepare("INSERT INTO players (id, handle, created_at) VALUES (?, ?, ?)")
      .bind(playerId, handle, Date.now())
      .run();
    return true;
  } catch (cause) {
    if (String(cause).includes("UNIQUE")) return false;
    throw cause;
  }
}

/**
 * Google n'est proposé que si ses deux secrets sont provisionnés : un environnement sans
 * eux (local, branche fraîche) garde la connexion par mot de passe seule, et le client
 * masque le bouton (`/api/auth/me`).
 */
function socialProviders(env: Env) {
  if (!hasGoogle(env)) return {};
  return {
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      // Toujours proposer le choix du compte : sur un poste partagé, se retrouver
      // connecté d'office avec le compte Google d'un autre serait la pire surprise.
      prompt: "select_account" as const,
    },
  };
}

export function hasGoogle(env: Env): boolean {
  return (env.GOOGLE_CLIENT_ID ?? "").length > 0 && (env.GOOGLE_CLIENT_SECRET ?? "").length > 0;
}

export function availableProviders(env: Env): string[] {
  return hasGoogle(env) ? ["google"] : [];
}

/**
 * Le proxy OAuth des environnements de branche. Google exige des adresses de retour
 * exactes, sans joker, et chaque branche a son domaine : plutôt que d'en déclarer une
 * par branche, toutes font revenir Google par la recette, qui leur renvoie le profil
 * chiffré. La recette porte donc le greffon elle aussi (elle y reconnaît sa propre URL
 * et ne proxifie pas ses propres connexions) ; la production et le local ne le portent
 * pas, leur adresse de retour étant déclarée chez Google.
 *
 * Le chiffrement utilise un secret **dédié**, partagé par la recette et les branches
 * seulement : une fuite côté branche ne permettrait pas de signer des sessions de
 * recette, ce que permettrait le partage d'`AUTH_SECRET`.
 */
function oauthProxyPlugin(env: Env) {
  const productionURL = env.OAUTH_PROXY_URL ?? "";
  const secret = env.OAUTH_PROXY_SECRET ?? "";
  if (productionURL.length === 0 || secret.length < 32 || !hasGoogle(env)) return [];
  return [oAuthProxy({ productionURL, secret })];
}

const FRESH_ACCOUNT_MS = 60 * 1000;

function providerLabel(providerId: string): string {
  return providerId === "google" ? "Google" : providerId;
}

function securityUrl(origin: string): string {
  return `${origin}/profile/#security`;
}
