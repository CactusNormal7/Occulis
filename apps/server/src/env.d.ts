interface Env {
  readonly DB: D1Database;
  readonly MATCH: DurableObjectNamespace;
  readonly QUEUE: DurableObjectNamespace;
  readonly ASSETS: Fetcher;

  /**
   * Le secret qui signe les cookies de session. **À provisionner par
   * `wrangler secret put AUTH_SECRET` dans chaque environnement** : sans lui, Better
   * Auth refuse de démarrer. C'est aussi ce qui rend une fuite de la seule base
   * inexploitable — le jeton y est en clair, mais le cookie qui le porte est signé.
   */
  readonly AUTH_SECRET: string;

  /** Clé Resend. Absente, les messages sont journalisés au lieu d'être envoyés. */
  readonly RESEND_API_KEY?: string;
  readonly MAIL_FROM?: string;
  /** Adresse de réponse des courriers ; sans elle, ils partent sans `Reply-To`. */
  readonly MAIL_REPLY_TO?: string;

  /**
   * Le client OAuth Google (docs/setup.md section 7). Sans les deux, la connexion
   * Google n'est pas proposée et le client masque son bouton.
   */
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_CLIENT_SECRET?: string;

  /**
   * Le proxy OAuth des environnements de branche (`auth/better-auth.ts`) : l'URL de la
   * recette, par laquelle Google revient, et le secret qui chiffre le profil transmis.
   * Posés sur la recette **et** sur chaque branche, jamais en production ni en local.
   */
  readonly OAUTH_PROXY_URL?: string;
  readonly OAUTH_PROXY_SECRET?: string;

  /** `off` coupe le contrôle des mots de passe ayant fuité (tests, poste hors ligne). */
  readonly PASSWORD_BREACH_CHECK?: string;
}
