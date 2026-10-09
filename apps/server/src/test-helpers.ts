import { SELF, env } from "cloudflare:test";
import { expect } from "vitest";

/**
 * Les outils partagés des suites d'intégration (authentification, back-office, profil).
 * Un module à part et non un fichier de test : importer un fichier de test depuis un
 * autre y rattache ses `describe`, et la suite d'origine se retrouve vide.
 */

/**
 * Le nom du cookie tel qu'un navigateur le renvoie. Le préfixe `__Secure-` n'est pas
 * décoratif : un navigateur refuse un cookie qui le porte et n'arrive pas par HTTPS.
 * Better Auth l'ajoute dès que les cookies sécurisés sont actifs, donc partout sauf sur
 * un `wrangler dev` en clair — d'où une constante qui vit ici, avec les tests qui
 * parlent en HTTPS, plutôt que dans le code du Worker qui n'en a plus besoin.
 */
export const SESSION_COOKIE = "__Secure-occulis.session_token";

export function unique(prefix: string): string {
  // Court : un pseudo est limité à 32 caractères, un UUID entier le dépasserait.
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Chaque appel prend une IP à lui. La limitation de débit compte par adresse : sans
 * ça, les cinq inscriptions par heure autorisées seraient épuisées par la suite
 * elle-même, et les tests se limiteraient les uns les autres. Le cas dédié plus bas
 * fixe une IP au contraire, précisément pour que la limite morde.
 *
 * L'adresse doit être une vraie IPv4 : Better Auth valide l'en-tête et retombe sur un
 * seau partagé si la valeur n'en est pas une — auquel cas la ségrégation ci-dessus
 * serait silencieusement sans effet.
 */
let addresses = 0;

function nextAddress(): string {
  addresses += 1;
  return `10.${(addresses >> 16) & 255}.${(addresses >> 8) & 255}.${addresses & 255}`;
}

export async function post(path: string, body: unknown, cookie?: string, ip?: string): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "CF-Connecting-IP": ip ?? nextAddress(),
    // Better Auth refuse les routes qui changent l'état sans origine connue —
    // une protection CSRF de plus que `SameSite` seul. Un navigateur pose cet
    // en-tête de lui-même ; à nous de faire pareil. C'est aussi ce qui devra être
    // déclaré en `trustedOrigins` le jour où le client Electron, qui n'est plus de
    // même origine, appellera ces routes (docs/architecture.md section 7).
    Origin: "https://occulis.test",
  };
  if (cookie !== undefined) headers["Cookie"] = cookie;
  return SELF.fetch(`https://occulis.test${path}`, { method: "POST", body: JSON.stringify(body), headers });
}

/** Rend le cookie de session, tel qu'un navigateur le renverrait. */
export function cookieFrom(response: Response): string {
  const header = response.headers.get("Set-Cookie");
  expect(header).not.toBeNull();
  const value = header?.split(";")[0] ?? "";
  expect(value.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
  return value;
}

export const PASSWORD = "un-mot-de-passe-assez-long";

export async function signUp(handle: string): Promise<string> {
  const response = await post("/api/auth/sign-up/email", {
    email: `${handle}@occulis.test`,
    password: PASSWORD,
    name: handle,
  });
  expect(response.status).toBe(200);

  // La file d'attente exige une adresse vérifiée. Le lien de vérification part par
  // courrier, hors de portée d'un test : on pose la colonne directement, ce qui éprouve
  // le même chemin que le clic sans avoir à intercepter le message.
  await verifyEmail(`${handle}@occulis.test`);
  return cookieFrom(response);
}

export async function verifyEmail(email: string): Promise<void> {
  await env.DB.prepare("UPDATE users SET email_verified = 1 WHERE email = ?").bind(email).run();
}

