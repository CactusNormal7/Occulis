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
}
