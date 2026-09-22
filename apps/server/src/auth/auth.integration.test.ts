import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

/**
 * L'authentification dans workerd. PBKDF2 passe par WebCrypto et D1 par le vrai
 * moteur : ni l'un ni l'autre n'a de sens sous un mock. Depuis le passage à Better
 * Auth, la bibliothèque elle-même n'a jamais été éprouvée ailleurs que dans le runtime
 * réel — c'est là qu'elle lit ses bindings.
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

async function me(cookie?: string): Promise<unknown> {
  const response = await SELF.fetch("https://occulis.test/api/auth/me", {
    headers: cookie === undefined ? {} : { Cookie: cookie },
  });
  return response.json();
}

describe("authentification", () => {
  it("inscrit un compte, ouvre une session et la reconnaît", async () => {
    const handle = unique("anne");
    const cookie = await signUp(handle);
    expect(await me(cookie)).toEqual({ signedIn: true, handle, emailVerified: true });
  });

  it("crée le profil de jeu en même temps que le compte", async () => {
    // Un compte possède un profil : c'est `players` qui porte le pseudo et l'ELO, et
    // le lien doit exister dès l'inscription, sans quoi la file n'a personne à inscrire.
    const handle = unique("bruno");
    await signUp(handle);

    const row = await env.DB.prepare(
      `SELECT players.handle, players.elo FROM users
       JOIN players ON players.id = users.player_id WHERE users.email = ?`,
    )
      .bind(`${handle}@occulis.test`)
      .first<{ handle: string; elo: number }>();

    expect(row).toEqual({ handle, elo: 1200 });
  });

  it("ne reconnaît personne sans cookie, ni sur un jeton inventé", async () => {
    expect(await me()).toEqual({ signedIn: false });
    expect(await me(`${SESSION_COOKIE}=jeton-inexistant`)).toEqual({ signedIn: false });
  });

  it("protège le cookie de session", async () => {
    const handle = unique("carla");
    const response = await post("/api/auth/sign-up/email", {
      email: `${handle}@occulis.test`,
      password: PASSWORD,
      name: handle,
    });
    const header = response.headers.get("Set-Cookie") ?? "";

    // Aucun des trois n'est optionnel : le jeton vaut un mot de passe tant qu'il vit.
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
  });

  it("signe le cookie, de sorte que le jeton stocké ne suffise pas à se faire passer pour quelqu'un", async () => {
    // Better Auth range le jeton **en clair** en base, là où l'implémentation
    // précédente n'en gardait que l'empreinte. Ce qui compense est ici : le cookie
    // porte le jeton *et* sa signature, et la signature dépend d'un secret qui n'est
    // pas en base. Lire la table ne donne donc pas de session utilisable.
    const handle = unique("diane");
    await signUp(handle);
    const stored = await env.DB.prepare(
      "SELECT token FROM sessions JOIN users ON users.id = sessions.user_id WHERE users.email = ?",
    )
      .bind(`${handle}@occulis.test`)
      .first<{ token: string }>();

    expect(stored?.token).toBeTruthy();
    expect(await me(`${SESSION_COOKIE}=${stored?.token ?? ""}`)).toEqual({ signedIn: false });
  });

  it("reconnecte avec le bon mot de passe et refuse le mauvais", async () => {
    const handle = unique("elia");
    await signUp(handle);
    const email = `${handle}@occulis.test`;

    const good = await post("/api/auth/sign-in/email", { email, password: PASSWORD });
    expect(good.status).toBe(200);

    const bad = await post("/api/auth/sign-in/email", { email, password: "un-mot-de-passe-different" });
    expect(bad.status).toBe(401);
  });

  it("répond la même chose à une adresse inconnue qu'à un mot de passe faux", async () => {
    // Distinguer les deux dirait à un inconnu quelles adresses sont inscrites.
    const handle = unique("faya");
    await signUp(handle);

    const wrongPassword = await post("/api/auth/sign-in/email", {
      email: `${handle}@occulis.test`,
      password: "pas-le-bon-du-tout",
    });
    const unknownEmail = await post("/api/auth/sign-in/email", {
      email: `${unique("personne")}@occulis.test`,
      password: "pas-le-bon-du-tout",
    });

    expect(wrongPassword.status).toBe(unknownEmail.status);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
  });

  it("refuse une adresse déjà prise", async () => {
    const handle = unique("gaby");
    await signUp(handle);

    const again = await post("/api/auth/sign-up/email", {
      email: `${handle}@occulis.test`,
      password: PASSWORD,
      name: unique("gaby-bis"),
    });
    expect(again.ok).toBe(false);
  });

  it("refuse un pseudo déjà pris sans laisser de compte derrière lui", async () => {
    // Le pseudo est unique dans `players`, que Better Auth ne connaît pas : c'est le
    // crochet d'inscription qui le tient. S'il échouait après coup, il resterait un
    // compte sans profil — donc un compte que la file refuserait sans rien expliquer.
    const handle = unique("hugo");
    await signUp(handle);
    const email = `${unique("hugo-bis")}@occulis.test`;

    const response = await post("/api/auth/sign-up/email", { email, password: PASSWORD, name: handle });
    expect(response.ok).toBe(false);

    const orphan = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    expect(orphan).toBeNull();
  });

  it("refuse un mot de passe trop court", async () => {
    const handle = unique("iris");
    const response = await post("/api/auth/sign-up/email", {
      email: `${handle}@occulis.test`,
      password: "court",
      name: handle,
    });
    expect(response.ok).toBe(false);
  });

  it("ferme la session à la déconnexion", async () => {
    const handle = unique("jonas");
    const cookie = await signUp(handle);

    const out = await post("/api/auth/sign-out", {}, cookie);
    expect(out.ok).toBe(true);
    expect(await me(cookie)).toEqual({ signedIn: false });
  });

  it("limite les tentatives de connexion répétées depuis une même adresse", async () => {
    // Le trou le plus béant de l'implémentation précédente : rien n'empêchait la force
    // brute autrement que le coût du PBKDF2. La limite est par IP, d'où l'adresse fixe.
    const handle = unique("kenza");
    await signUp(handle);
    const email = `${handle}@occulis.test`;
    const ip = "203.0.113.7";

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 8; attempt++) {
      const response = await post("/api/auth/sign-in/email", { email, password: "faux" }, undefined, ip);
      statuses.push(response.status);
    }

    expect(statuses).toContain(429);
  });

  it("ne dit pas si une adresse est inscrite quand on demande une réinitialisation", async () => {
    const handle = unique("lila");
    await signUp(handle);

    const known = await post("/api/auth/request-password-reset", {
      email: `${handle}@occulis.test`,
      redirectTo: "/?reinitialiser=1",
    });
    const unknown = await post("/api/auth/request-password-reset", {
      email: `${unique("fantome")}@occulis.test`,
      redirectTo: "/?reinitialiser=1",
    });

    // Le succès des deux est vérifié, et pas seulement leur égalité : deux 404
    // identiques satisferaient une comparaison, tout en prouvant seulement que la
    // route n'existe pas. C'est exactement ce qui est arrivé avec l'ancien nom
    // `/forget-password`, renommé en 1.7.
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
  });

  it("réinitialise réellement un mot de passe, et invalide l'ancien", async () => {
    const handle = unique("marin");
    await signUp(handle);
    const email = `${handle}@occulis.test`;

    const asked = await post("/api/auth/request-password-reset", { email, redirectTo: "/" });
    expect(asked.status).toBe(200);

    // Le jeton part par courrier ; on le relit en base plutôt que d'intercepter le
    // message. C'est le même jeton, sur le même chemin de vérification.
    const stored = await env.DB.prepare(
      "SELECT value FROM verifications WHERE identifier LIKE ? ORDER BY created_at DESC LIMIT 1",
    )
      .bind("reset-password:%")
      .first<{ value: string }>();
    expect(stored?.value).toBeTruthy();

    const token = await env.DB.prepare(
      "SELECT identifier FROM verifications WHERE value = ? LIMIT 1",
    )
      .bind(stored?.value ?? "")
      .first<{ identifier: string }>();
    const reset = await post("/api/auth/reset-password", {
      newPassword: "un-tout-autre-mot-de-passe",
      token: (token?.identifier ?? "").replace("reset-password:", ""),
    });
    expect(reset.status).toBe(200);

    const withOld = await post("/api/auth/sign-in/email", { email, password: PASSWORD });
    expect(withOld.status).toBe(401);

    const withNew = await post("/api/auth/sign-in/email", {
      email,
      password: "un-tout-autre-mot-de-passe",
    });
    expect(withNew.status).toBe(200);
  });

  it("garde une adresse non vérifiée hors de la file d'attente", async () => {
    // L'adresse vérifiée n'est pas exigée pour se connecter, mais pour être apparié :
    // c'est le jeu classé qu'un compte jetable viendrait polluer.
    const handle = unique("milo");
    const response = await post("/api/auth/sign-up/email", {
      email: `${handle}@occulis.test`,
      password: PASSWORD,
      name: handle,
    });
    const cookie = cookieFrom(response);

    const refused = await SELF.fetch("https://occulis.test/api/queue", {
      headers: { Upgrade: "websocket", Cookie: cookie },
    });
    expect(refused.status).toBe(403);
  });
});
