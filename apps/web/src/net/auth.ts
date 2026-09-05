/**
 * Appels d'authentification. Le jeton de session n'apparaît jamais ici : il vit dans
 * un cookie `HttpOnly`, que le navigateur joint seul et que ce code ne peut pas lire.
 * C'est voulu — un jeton lisible en JavaScript est un jeton exfiltrable.
 */
export interface Identity {
  readonly signedIn: boolean;
  readonly handle?: string;
}

export type AuthOutcome = { readonly ok: true; readonly identity: Identity } | { readonly ok: false; readonly message: string };

export async function whoAmI(): Promise<Identity> {
  const response = await fetch("/api/auth/me");
  if (!response.ok) return { signedIn: false };
  return (await response.json()) as Identity;
}

export async function register(email: string, password: string, handle: string): Promise<AuthOutcome> {
  return submit("/api/auth/register", { email, password, handle });
}

export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  return submit("/api/auth/login", { email, password });
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

async function submit(path: string, body: unknown): Promise<AuthOutcome> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & Identity;

  if (!response.ok) return { ok: false, message: payload.error ?? "Échec de la connexion." };
  return { ok: true, identity: payload };
}
