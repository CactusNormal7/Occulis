import beta from "../content/fr/beta.json";
import {
  PENDING_TTL_MS,
  confirm,
  signup,
  unsubscribe,
  type BetaDeps,
  type SignupCode,
} from "./beta";
import { sendConfirmation, type MailEnv } from "./mail";
import { d1Store } from "./store";

/**
 * Le Worker du site vitrine. Les pages sont des fichiers statiques (Astro, `dist/`),
 * servis par les assets avant lui ; il ne reçoit que `/api/*` (`run_worker_first` dans
 * wrangler.toml) et la purge quotidienne des inscriptions non confirmées.
 */
interface Env extends MailEnv {
  readonly ASSETS: Fetcher;
  readonly DB: D1Database;
  /** Limiteur de Workers : quelques envois par minute et par connexion. */
  readonly BETA_LIMIT?: RateLimit;
  readonly SITE_URL: string;
  readonly BETA_SECRET: string;
}

const STATUS: Record<SignupCode, number> = {
  sent: 200,
  "invalid-email": 400,
  "consent-required": 400,
  "too-many": 429,
  failed: 502,
};

function redirect(env: Env, path: string): Response {
  return new Response(null, { status: 303, headers: { Location: `${env.SITE_URL}${path}` } });
}

function depsFor(env: Env, request: Request): BetaDeps {
  return {
    store: d1Store(env.DB),
    sendConfirmation: (mail) => sendConfirmation(env, mail),
    withinLimit: async () => {
      if (env.BETA_LIMIT === undefined) return true;
      const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
      return (await env.BETA_LIMIT.limit({ key })).success;
    },
    now: () => Date.now(),
    siteUrl: env.SITE_URL,
    secret: env.BETA_SECRET,
    consentText: beta.consent,
  };
}

const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

async function handleSignup(request: Request, env: Env): Promise<Response> {
  const wantsJson = (request.headers.get("Accept") ?? "").includes("application/json");
  // Un formulaire posté depuis un autre site n'a rien à faire ici.
  const origin = request.headers.get("Origin");
  if (
    origin !== null &&
    origin !== new URL(env.SITE_URL).origin &&
    origin !== new URL(request.url).origin
  )
    return new Response(null, { status: 403 });
  const form = await request.formData().catch(() => new FormData());
  const code = await signup(
    {
      email: field(form, "email"),
      consent: field(form, "consent"),
      website: field(form, "website"),
      shown: field(form, "shown"),
    },
    depsFor(env, request),
  );
  if (wantsJson) return Response.json({ code }, { status: STATUS[code] });
  return redirect(env, code === "sent" ? "/inscription-envoyee/" : "/inscription-refusee/");
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const deps = depsFor(env, request);

    if (url.pathname === "/api/beta" && request.method === "POST")
      return handleSignup(request, env);

    if (url.pathname === "/api/beta/confirm" && request.method === "GET") {
      const ok = await confirm(url.searchParams.get("token") ?? "", deps);
      return redirect(env, ok ? "/confirmation/" : "/lien-invalide/");
    }

    if (url.pathname === "/api/beta/unsubscribe") {
      // Le lien d'un message mène à une page qui demande un clic : un antivirus qui suit
      // les liens ne désinscrit personne.
      if (request.method === "GET") {
        const token = url.searchParams.get("token") ?? "";
        return redirect(env, `/desinscription/?token=${encodeURIComponent(token)}`);
      }
      if (request.method === "POST") {
        // Le jeton vient du formulaire de la page, ou de l'URL pour le clic unique
        // déclenché par le client de messagerie (List-Unsubscribe-Post).
        const form = await request.formData().catch(() => new FormData());
        const token = field(form, "token") || (url.searchParams.get("token") ?? "");
        const ok = await unsubscribe(token, deps);
        if (form.get("List-Unsubscribe") === "One-Click")
          return new Response(null, { status: ok ? 200 : 400 });
        return redirect(env, ok ? "/desinscription-faite/" : "/lien-invalide/");
      }
    }

    if (url.pathname.startsWith("/api/"))
      return Response.json({ code: "not-found" }, { status: 404 });
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env): Promise<void> {
    await d1Store(env.DB).purgePending(Date.now() - PENDING_TTL_MS);
  },
} satisfies ExportedHandler<Env>;
