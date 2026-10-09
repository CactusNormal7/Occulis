import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Button, Divider, FormMessage, FormPanel, PasswordField, ProviderButton, TextField, UiRoot } from "@occulis/ui";
import {
  register,
  requestReset,
  resetPassword,
  signIn,
  signInWithGoogle,
  type AuthOutcome,
} from "../net/auth.js";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  fieldOf,
  forgetResetEmail,
  passwordHint,
  pathOf,
  recallResetEmail,
  rememberResetEmail,
  routeOf,
  type AccountRoute,
  type FieldName,
  type Notice,
  type RouteKind,
} from "./model.js";

/**
 * L'écran de compte : connexion, inscription, mot de passe oublié, réinitialisation.
 *
 * Écrit pour les gestionnaires de mots de passe avant tout, parce que c'est par eux que
 * passe un mot de passe solide :
 * - **un formulaire par parcours, chacun à son URL** (`/connexion`, `/inscription`…) :
 *   un formulaire unique dont on masquait des champs ne laissait pas distinguer une
 *   connexion d'une inscription, donc pas proposer de générer un mot de passe ;
 * - des `autocomplete` exacts (`username`, `current-password`, `new-password`) sur des
 *   champs nommés et libellés, le pseudo **après** l'adresse pour qu'il ne soit pas pris
 *   pour l'identifiant ;
 * - un vrai `<form>` soumis, puis une **navigation** (`history`) au succès : c'est à elle
 *   que les gestionnaires reconnaissent une connexion réussie et proposent d'enregistrer.
 */
export interface AccountAppProps {
  /** Le parcours lu dans l'URL au chargement, avant que ses paramètres en soient retirés. */
  readonly initialRoute: AccountRoute;
  readonly initialNotice: Notice | undefined;
  readonly providers: readonly string[];
  /** Une session vient d'être ouverte : la page relit l'identité et passe au menu. */
  readonly onSignedIn: (message?: string) => void;
}

export function AccountApp({ initialRoute, initialNotice, providers, onSignedIn }: AccountAppProps) {
  const [route, setRoute] = useState<AccountRoute>(initialRoute);
  const [notice, setNotice] = useState<Notice | undefined>(initialNotice);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const back = () => {
      setRoute(routeOf(location.pathname, location.search));
      setNotice(undefined);
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);

  const navigate = (kind: RouteKind, next?: Notice) => {
    if (location.pathname !== pathOf(kind)) history.pushState(null, "", pathOf(kind));
    setRoute(kind === "reset" ? { kind, token: undefined } : { kind });
    setNotice(next);
  };

  const signedIn = (message?: string) => {
    // La navigation est le signal qu'attendent les gestionnaires de mots de passe pour
    // proposer l'enregistrement ; elle ramène aussi l'URL à celle du menu.
    history.pushState(null, "", "/");
    onSignedIn(message);
  };

  const google = providers.includes("google");
  const shared = { email, setEmail, notice, setNotice, navigate, google };

  return (
    <UiRoot>
      {route.kind === "signin" && <SignIn {...shared} onSuccess={signedIn} />}
      {route.kind === "register" && <Register {...shared} onSuccess={signedIn} />}
      {route.kind === "forgot" && <Forgot {...shared} />}
      {route.kind === "reset" && <Reset {...shared} token={route.token} />}
    </UiRoot>
  );
}

interface Shared {
  readonly email: string;
  readonly setEmail: (email: string) => void;
  readonly notice: Notice | undefined;
  readonly setNotice: (notice: Notice | undefined) => void;
  readonly navigate: (kind: RouteKind, notice?: Notice) => void;
  readonly google: boolean;
}

/** L'état commun d'un formulaire : envoi en cours, refus général, refus par champ. */
function useSubmission(formId: string, setNotice: (notice: Notice | undefined) => void) {
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: FieldName; message: string } | undefined>(undefined);
  const focusOnError = useRef(false);

  useEffect(() => {
    if (!focusOnError.current) return;
    focusOnError.current = false;
    const target = fieldError === undefined ? undefined : document.querySelector<HTMLInputElement>(`#${formId} [name="${fieldError.field}"]`);
    target?.focus();
    target?.select();
  }, [fieldError, formId]);

  const run = async (attempt: () => Promise<AuthOutcome>, onSuccess: () => void) => {
    setBusy(true);
    setFieldError(undefined);
    setNotice(undefined);
    const outcome = await attempt();
    setBusy(false);
    if (outcome.ok) {
      onSuccess();
      return;
    }
    const field = fieldOf(outcome.code);
    focusOnError.current = field !== undefined;
    if (field === undefined) setNotice({ tone: "error", text: outcome.message });
    else setFieldError({ field, message: outcome.message });
  };

  const errorFor = (field: FieldName): string | undefined => (fieldError?.field === field ? fieldError.message : undefined);
  return { busy, run, errorFor };
}

function SignIn({ email, setEmail, notice, setNotice, navigate, google, onSuccess }: Shared & { onSuccess: () => void }) {
  const { busy, run, errorFor } = useSubmission("signin-form", setNotice);
  const [password, setPassword] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(() => signIn(email.trim(), password), onSuccess);
  };
  return (
    <FormPanel
      title="Connexion"
      lead="Le tactique au tour par tour, où l'on ne voit que ce que ses pièces voient."
      footer={
        <>
          <RouteLink kind="forgot" navigate={navigate}>
            Mot de passe oublié ?
          </RouteLink>
          <span>
            Pas encore de compte ?{" "}
            <RouteLink kind="register" navigate={navigate}>
              Créer un compte
            </RouteLink>
          </span>
        </>
      }
    >
      <NoticeLine notice={notice} navigate={navigate} />
      {google && <GoogleEntry setNotice={setNotice} />}
      <form id="signin-form" method="post" action="/api/auth/sign-in/email" onSubmit={submit}>
        <TextField
          label="Adresse électronique"
          id="signin-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errorFor("email")}
        />
        <PasswordField
          label="Mot de passe"
          id="signin-password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errorFor("password")}
        />
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </FormPanel>
  );
}

function Register({ email, setEmail, notice, setNotice, navigate, google, onSuccess }: Shared & { onSuccess: (message?: string) => void }) {
  const { busy, run, errorFor } = useSubmission("register-form", setNotice);
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    void run(
      () => register(address, password, handle),
      () => onSuccess(`Compte créé. Un lien de confirmation est parti vers ${address}.`),
    );
  };
  return (
    <FormPanel
      title="Créer un compte"
      lead="Une adresse confirmée ouvre la file d'attente et les parties privées."
      footer={
        <span>
          Déjà un compte ?{" "}
          <RouteLink kind="signin" navigate={navigate}>
            Se connecter
          </RouteLink>
        </span>
      }
    >
      <NoticeLine notice={notice} navigate={navigate} />
      {google && <GoogleEntry setNotice={setNotice} />}
      <form id="register-form" method="post" action="/api/auth/sign-up/email" onSubmit={submit}>
        <TextField
          label="Adresse électronique"
          id="register-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errorFor("email")}
        />
        <TextField
          label="Pseudo"
          id="register-handle"
          name="handle"
          type="text"
          autoComplete="nickname"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={2}
          maxLength={24}
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          hint="Ce que vos adversaires verront. Modifiable depuis votre profil."
          error={errorFor("handle")}
        />
        <PasswordField
          label="Mot de passe"
          id="register-password"
          name="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          // Lu par Safari et 1Password pour générer un mot de passe conforme.
          {...{ passwordrules: `minlength: ${MIN_PASSWORD_LENGTH}; maxlength: ${MAX_PASSWORD_LENGTH};` }}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={passwordHint(password)}
          error={errorFor("password")}
        />
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Création…" : "Créer le compte"}
        </Button>
      </form>
    </FormPanel>
  );
}

function Forgot({ email, setEmail, notice, setNotice, navigate }: Shared) {
  const { busy, run, errorFor } = useSubmission("forgot-form", setNotice);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    void run(
      () => requestReset(address),
      () => {
        rememberResetEmail(address);
        // La même phrase que l'adresse ait un compte ou non : le serveur ne le dit pas,
        // l'interface ne doit pas le laisser deviner.
        setNotice({
          tone: "success",
          text: `Si un compte existe pour ${address}, un lien vient de partir. Il expire dans une heure.`,
        });
      },
    );
  };
  return (
    <FormPanel
      title="Mot de passe oublié"
      lead="Un lien pour en choisir un nouveau vous sera envoyé."
      footer={
        <RouteLink kind="signin" navigate={navigate}>
          ← Retour à la connexion
        </RouteLink>
      }
    >
      <NoticeLine notice={notice} navigate={navigate} />
      <form id="forgot-form" method="post" action="/api/auth/request-password-reset" onSubmit={submit}>
        <TextField
          label="Adresse électronique"
          id="forgot-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errorFor("email")}
        />
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Envoi…" : "Envoyer le lien"}
        </Button>
      </form>
    </FormPanel>
  );
}

function Reset({ setEmail, notice, setNotice, navigate, token }: Shared & { token: string | undefined }) {
  const { busy, run, errorFor } = useSubmission("reset-form", setNotice);
  const [account, setAccount] = useState(recallResetEmail);
  const [password, setPassword] = useState("");

  if (token === undefined) {
    return (
      <FormPanel title="Nouveau mot de passe" footer={<RouteLink kind="signin" navigate={navigate}>← Retour à la connexion</RouteLink>}>
        <NoticeLine
          notice={notice ?? { tone: "error", text: "Ce lien n'est plus valable. Demandez-en un nouveau.", retry: "reset" }}
          navigate={navigate}
        />
      </FormPanel>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () => resetPassword(token, password),
      () => {
        forgetResetEmail();
        setEmail(account);
        navigate("signin", {
          tone: "success",
          text: "Mot de passe changé, et toutes les sessions ouvertes fermées. Connectez-vous avec le nouveau.",
        });
      },
    );
  };
  return (
    <FormPanel
      title="Nouveau mot de passe"
      lead="Il remplacera l'ancien et fermera toutes les sessions ouvertes."
      footer={<RouteLink kind="signin" navigate={navigate}>← Retour à la connexion</RouteLink>}
    >
      <NoticeLine notice={notice} navigate={navigate} />
      <form id="reset-form" method="post" action="/api/auth/reset-password" onSubmit={submit}>
        {/* Rattache le nouveau mot de passe à la bonne entrée du gestionnaire. Le
            serveur ne l'utilise pas : le jeton désigne déjà le compte. */}
        <TextField
          label="Adresse du compte"
          id="reset-email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={account}
          onChange={(event) => setAccount(event.target.value)}
        />
        <PasswordField
          label="Nouveau mot de passe"
          id="reset-password"
          name="password"
          autoComplete="new-password"
          required
          autoFocus
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          {...{ passwordrules: `minlength: ${MIN_PASSWORD_LENGTH}; maxlength: ${MAX_PASSWORD_LENGTH};` }}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={passwordHint(password)}
          error={errorFor("password")}
        />
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Enregistrement…" : "Choisir ce mot de passe"}
        </Button>
      </form>
    </FormPanel>
  );
}

function GoogleEntry({ setNotice }: { setNotice: (notice: Notice | undefined) => void }) {
  const [busy, setBusy] = useState(false);
  const start = () => {
    setBusy(true);
    setNotice(undefined);
    void signInWithGoogle().then((outcome) => {
      // En cas de succès la page part chez Google : on ne réactive rien.
      if (outcome.ok) return;
      setBusy(false);
      setNotice({ tone: "error", text: outcome.message });
    });
  };
  return (
    <>
      <ProviderButton provider="google" onClick={start} disabled={busy} />
      <Divider>ou</Divider>
    </>
  );
}

function NoticeLine({ notice, navigate }: { notice: Notice | undefined; navigate: Shared["navigate"] }) {
  if (notice === undefined) return null;
  const action =
    notice.retry === "reset" ? (
      <Button size="sm" onClick={() => navigate("forgot")}>
        Nouveau lien
      </Button>
    ) : undefined;
  return (
    <FormMessage tone={notice.tone} action={action}>
      {notice.text}
      {notice.retry === "verification" && " Connectez-vous : le menu propose de renvoyer le message."}
    </FormMessage>
  );
}

/** Un lien vers un autre parcours : une vraie URL, suivie sans recharger la page. */
function RouteLink({ kind, navigate, children }: { kind: RouteKind; navigate: Shared["navigate"]; children: ReactNode }) {
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(kind);
  };
  return (
    <a href={pathOf(kind)} onClick={follow}>
      {children}
    </a>
  );
}
