import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "./password.js";
import { resetLetter, sendLetter, verificationLetter } from "./mail.js";

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
export function buildAuth(env: Env, origin: string) {
  return betterAuth({
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
        await sendLetter(env, resetLetter(user.email, url));
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendLetter(env, verificationLetter(user.email, url));
      },
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
        "/forget-password": { window: 3600, max: 3 },
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
          before: async (user) => {
            const playerId = crypto.randomUUID();
            const handle = user.name.trim();
            if (handle.length < 2 || handle.length > 32) {
              throw new APIError("BAD_REQUEST", { message: "handle-length", code: "HANDLE_LENGTH" });
            }
            try {
              await env.DB.prepare("INSERT INTO players (id, handle, created_at) VALUES (?, ?, ?)")
                .bind(playerId, handle, Date.now())
                .run();
            } catch (cause) {
              if (!String(cause).includes("UNIQUE")) throw cause;
              // Un `code` explicite : le client traduit sur lui, jamais sur la phrase,
              // qui n'est pas un contrat.
              throw new APIError("UNPROCESSABLE_ENTITY", {
                message: "handle-taken",
                code: "HANDLE_TAKEN",
              });
            }
            return { data: { ...user, playerId } };
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
