import { useEffect, useState } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  CardColumn,
  CardGrid,
  Dialog,
  EmptyState,
  Hero,
  IconButton,
  List,
  ListRow,
  Note,
  Pager,
  PasswordField,
  ProgressBar,
  SettingEditor,
  SettingList,
  SettingRow,
  TextField,
  TileAvatar,
  ToastProvider,
  TopBar,
  UiRoot,
  useToast,
} from "@occulis/ui";
import type { MeProfile, MeSession } from "@occulis/protocol";
import { linkGoogle, stopImpersonating } from "../net/auth.js";
import { useLoad, type Loaded } from "../admin/hooks.js";
import { formatDate, shortAgent } from "../admin/model.js";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, passwordHint } from "../account/model.js";
import * as api from "./api.js";
import * as friends from "../social/api.js";
import { unreadTotal } from "../social/model.js";
import { ChatView, FriendMatchReplay, FriendView, FriendsView, SocialProvider, useSocial } from "./Friends.js";
import { MatchReplayView, MatchTable, RecordCard } from "./parts.js";
import {
  arrivalMessage,
  canUnlink,
  handleCooldownLabel,
  parseProfileRoute,
  profileHash,
  sinceLabel,
  tabOf,
  type ProfileRoute,
} from "./model.js";

/**
 * La page de profil, servie sous `/profil/` : le pendant du back-office, pour son propre
 * compte. En React sur `@occulis/ui`, sans classe ni couleur propres.
 *
 * Tout ce que la page grise, le serveur le refuse aussi : l'identité vient du cookie,
 * chaque requête est bornée au compte de la session, et une session d'emprunt n'y
 * modifie rien (`apps/server/src/me/routes.ts`, `auth/better-auth.ts`).
 */
export function App() {
  const route = useProfileRoute();
  const { loaded, reload } = useLoad("profil", api.profile);
  const signedIn = loaded.state === "ready";

  return (
    <UiRoot fullPage>
      <ToastProvider>
        <SocialProvider enabled={signedIn && loaded.value.emailVerified}>
          <Frame route={route} loaded={loaded} reload={reload} signedIn={signedIn} />
        </SocialProvider>
      </ToastProvider>
    </UiRoot>
  );
}

function Frame({
  route,
  loaded,
  reload,
  signedIn,
}: {
  route: ProfileRoute;
  loaded: Loaded<MeProfile>;
  reload: () => void;
  signedIn: boolean;
}) {
  const unread = unreadTotal(useSocial().state);
  return (
    <>
        <ProgressBar active={loaded.state === "loading"} />
        <TopBar
          section="profil"
          brandHref="/"
          tabs={
            signedIn
              ? [
                  { href: profileHash({ view: "account" }), label: "Compte", current: route.view === "account" },
                  { href: profileHash({ view: "matches", offset: 0 }), label: "Parties", current: tabOf(route) === "matches" },
                  {
                    href: profileHash({ view: "friends" }),
                    label: unread > 0 ? `Amis (${unread})` : "Amis",
                    current: tabOf(route) === "friends",
                  },
                ]
              : []
          }
          end={
            <>
              {loaded.state === "ready" && <span>{loaded.value.handle}</span>}
              <a href="/">retour au jeu →</a>
            </>
          }
        />
        <main className="occ-page">
          <Gate loaded={loaded} route={route} reload={reload} />
        </main>
    </>
  );
}

function useProfileRoute(): ProfileRoute {
  const [route, setRoute] = useState(() => parseProfileRoute(location.hash));
  useEffect(() => {
    const update = () => setRoute(parseProfileRoute(location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

function Gate({ loaded, route, reload }: { loaded: Loaded<MeProfile>; route: ProfileRoute; reload: () => void }) {
  if (loaded.state === "loading") return null;
  if (loaded.state === "failed") {
    return <EmptyState action={<a href="/connexion">Se connecter →</a>}>{loaded.message}</EmptyState>;
  }
  const profile = loaded.value;
  return (
    <div key={profileHash(route)} className="occ-stack occ-enter">
      {profile.impersonating && (
        <Banner
          icon="impersonate"
          action={
            <Button variant="danger" onClick={() => void stopImpersonating().then(() => location.assign("/admin/"))}>
              Revenir à mon compte
            </Button>
          }
        >
          Session d'emprunt : ce profil est en lecture seule.
        </Banner>
      )}
      {route.view === "account" && <Account profile={profile} reload={reload} />}
      {route.view === "matches" && <Matches offset={route.offset} readOnly={profile.impersonating} />}
      {route.view === "match" && <MatchReplay id={route.id} />}
      {route.view === "friends" && <FriendsView readOnly={profile.impersonating} />}
      {route.view === "friend" && <FriendView id={route.id} offset={route.offset} readOnly={profile.impersonating} />}
      {route.view === "friendMatch" && <FriendMatchReplay id={route.id} matchId={route.matchId} />}
      {route.view === "chat" && <ChatView id={route.id} readOnly={profile.impersonating} />}
    </div>
  );
}

// --- Compte ---------------------------------------------------------------------------

/** Le réglage dont l'éditeur est ouvert : un seul à la fois. */
type Editing = "handle" | "email" | "password" | null;

/**
 * La vue du compte : des réglages **en lecture d'abord**, chacun avec son bouton. Rien
 * n'est un champ tant qu'on n'a pas demandé à le modifier, et un seul éditeur est ouvert
 * à la fois — ce qu'on change reste lisible, à côté de ce qu'on ne change pas.
 */
function Account({ profile, reload }: { profile: MeProfile; reload: () => void }) {
  const notify = useToast();
  const readOnly = profile.impersonating;
  const [editing, setEditing] = useState<Editing>(null);

  // Le message d'une redirection (bienvenue Google, liaison) est lu une fois, puis retiré
  // de l'URL pour ne pas réapparaître à chaque rechargement.
  useEffect(() => {
    const arrival = arrivalMessage(location.search);
    if (arrival !== undefined) notify(arrival.text, arrival.ok);
    if (location.search.length > 0) history.replaceState(null, "", `${location.pathname}${location.hash}`);
    if (location.hash === "#securite") document.getElementById("securite")?.scrollIntoView();
  }, []);

  /** Un éditeur a abouti : on l'annonce, on le referme, et on relit le compte. */
  const done = (message: string) => {
    notify(message, true);
    setEditing(null);
    reload();
  };
  const edit = (which: Exclude<Editing, null>) => (readOnly ? undefined : () => setEditing(which));
  const cancel = () => setEditing(null);
  const cooldown = handleCooldownLabel(profile, Date.now());

  return (
    <>
      <Hero
        avatar={<TileAvatar name={profile.handle} size="lg" />}
        title={profile.handle}
        badges={profile.emailVerified ? <Badge>adresse vérifiée</Badge> : <Badge tone="dim">adresse non vérifiée</Badge>}
        meta={[profile.email, `membre depuis le ${formatDate(profile.createdAt)}`]}
      />
      {!profile.emailVerified && <VerifyBanner profile={profile} readOnly={readOnly} />}
      <CardGrid>
        <CardColumn>
          <Card title="Compte">
            <SettingList>
              <SettingRow
                label="Pseudo"
                value={profile.handle}
                description={cooldown ?? "Ce que vos adversaires voient de vous."}
                onEdit={edit("handle")}
                editDisabled={cooldown !== undefined}
                editing={editing === "handle"}
              >
                <HandleEditor current={profile.handle} onDone={done} onCancel={cancel} />
              </SettingRow>
              <SettingRow
                label="Adresse électronique"
                value={profile.email}
                description={profile.emailVerified ? "Vérifiée. Elle sert à vous connecter et à recevoir les liens de sécurité." : "Non vérifiée."}
                onEdit={edit("email")}
                editing={editing === "email"}
              >
                <EmailEditor profile={profile} onDone={done} onCancel={cancel} />
              </SettingRow>
            </SettingList>
          </Card>
          <RecordCard record={profile.record} action={<a href={profileHash({ view: "matches", offset: 0 })}>historique →</a>} />
          <SpectatorsCard profile={profile} readOnly={readOnly} onDone={done} />
        </CardColumn>
        <CardColumn>
          <Card title="Connexion et sécurité" id="securite">
            <SettingList>
              <SettingRow
                label="Mot de passe"
                value={profile.hasPassword ? "••••••••••" : "Aucun"}
                description={profile.hasPassword ? undefined : "Ce compte se connecte par Google seulement."}
                editLabel={profile.hasPassword ? "Changer" : "Définir"}
                onEdit={edit("password")}
                editing={editing === "password"}
              >
                {profile.hasPassword ? (
                  <PasswordEditor email={profile.email} onDone={done} onCancel={cancel} />
                ) : (
                  <PasswordSetupEditor email={profile.email} onDone={done} onCancel={cancel} />
                )}
              </SettingRow>
              {(profile.availableProviders.includes("google") || profile.providers.includes("google")) && (
                <GoogleSetting profile={profile} readOnly={readOnly} onDone={done} />
              )}
            </SettingList>
          </Card>
          <Sessions readOnly={readOnly} />
          <DangerZone profile={profile} readOnly={readOnly} />
        </CardColumn>
      </CardGrid>
    </>
  );
}

function VerifyBanner({ profile, readOnly }: { profile: MeProfile; readOnly: boolean }) {
  const notify = useToast();
  const [sent, setSent] = useState(false);
  const resend = () =>
    void api.resendVerification(profile.email).then((outcome) => {
      notify(outcome.ok ? `Lien renvoyé à ${profile.email}.` : outcome.message, outcome.ok);
      if (outcome.ok) setSent(true);
    });
  return (
    <Banner
      icon="mail"
      action={
        <Button disabled={readOnly || sent} onClick={resend}>
          {sent ? "Lien envoyé" : "Renvoyer le lien"}
        </Button>
      }
    >
      Confirmez votre adresse pour ouvrir la file d'attente et les parties privées.
    </Banner>
  );
}

/** L'état commun d'un éditeur : envoi en cours, refus affiché dans l'éditeur même. */
function useEditor(onDone: (message: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const run = (pending: Promise<api.Outcome<unknown>>, message: string) => {
    setBusy(true);
    setError(undefined);
    void pending.then((outcome) => {
      setBusy(false);
      if (outcome.ok) onDone(message);
      else setError(outcome.message);
    });
  };
  return { busy, error, run };
}

interface EditorProps {
  onDone: (message: string) => void;
  onCancel: () => void;
}

function HandleEditor({ current, onDone, onCancel }: EditorProps & { current: string }) {
  const { busy, error, run } = useEditor(onDone);
  const [value, setValue] = useState(current);
  return (
    <SettingEditor
      submitLabel="Enregistrer"
      busy={busy}
      error={error}
      onCancel={onCancel}
      onSubmit={() => run(api.changeHandle(value), "Pseudo changé. Vos adversaires le verront dès la prochaine partie.")}
      note="Une fois changé, le pseudo est fixé pour 30 jours."
    >
      <TextField
        label="Nouveau pseudo"
        name="handle"
        autoComplete="nickname"
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={2}
        maxLength={24}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        hint="2 à 24 caractères : lettres, chiffres, espaces, points, tirets."
      />
    </SettingEditor>
  );
}

function EmailEditor({ profile, onDone, onCancel }: EditorProps & { profile: MeProfile }) {
  const { busy, error, run } = useEditor(onDone);
  const [value, setValue] = useState("");
  const address = value.trim();
  return (
    <SettingEditor
      submitLabel="Envoyer le lien"
      busy={busy}
      error={error}
      onCancel={onCancel}
      onSubmit={() =>
        run(
          api.changeEmail(address),
          profile.emailVerified
            ? `Lien de confirmation envoyé à ${profile.email}. Rien ne change avant votre accord.`
            : `Lien de vérification envoyé à ${address}.`,
        )
      }
      note={
        profile.emailVerified
          ? `Un lien part d'abord vers ${profile.email} pour confirmer, puis vers la nouvelle adresse pour la vérifier. Rien ne change avant les deux.`
          : "Un lien de vérification partira vers la nouvelle adresse."
      }
    >
      <TextField
        label="Nouvelle adresse"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </SettingEditor>
  );
}

/**
 * Le changement de mot de passe : l'adresse du compte figure dans un champ `username`
 * caché, pour que le gestionnaire de mots de passe mette à jour la bonne entrée plutôt
 * que d'en créer une nouvelle.
 */
function PasswordEditor({ email, onDone, onCancel }: EditorProps & { email: string }) {
  const { busy, error, run } = useEditor(onDone);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  return (
    <SettingEditor
      id="password-form"
      method="post"
      action="/api/auth/change-password"
      submitLabel="Changer le mot de passe"
      busy={busy}
      error={error}
      onCancel={onCancel}
      onSubmit={() => run(api.changePassword(current, next), "Mot de passe changé. Vos autres sessions ont été fermées.")}
      note="Vos autres sessions seront fermées."
    >
      <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
      <PasswordField
        label="Mot de passe actuel"
        name="current-password"
        autoComplete="current-password"
        required
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
      />
      <PasswordField
        label="Nouveau mot de passe"
        name="new-password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={MAX_PASSWORD_LENGTH}
        {...{ passwordrules: `minlength: ${MIN_PASSWORD_LENGTH}; maxlength: ${MAX_PASSWORD_LENGTH};` }}
        value={next}
        onChange={(event) => setNext(event.target.value)}
        hint={passwordHint(next)}
      />
    </SettingEditor>
  );
}

/** Un compte Google sans mot de passe en obtient un par le lien envoyé à son adresse. */
function PasswordSetupEditor({ email, onDone, onCancel }: EditorProps & { email: string }) {
  const { busy, error, run } = useEditor(onDone);
  return (
    <SettingEditor
      submitLabel="Envoyer le lien"
      busy={busy}
      error={error}
      onCancel={onCancel}
      onSubmit={() => run(api.requestPasswordSetup(email), `Lien envoyé à ${email}. Il expire dans une heure.`)}
    >
      <Note>Un lien pour choisir votre mot de passe va partir vers {email} : c'est la preuve que l'adresse est bien à vous.</Note>
    </SettingEditor>
  );
}

function GoogleSetting({ profile, readOnly, onDone }: { profile: MeProfile; readOnly: boolean; onDone: (message: string) => void }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const linked = profile.providers.includes("google");
  const removable = canUnlink(profile, "google");

  const link = () => {
    setBusy(true);
    void linkGoogle().then((outcome) => {
      // En cas de succès, la page part chez Google.
      if (outcome.ok) return;
      setBusy(false);
      notify(outcome.message, false);
    });
  };
  const unlink = () => {
    setBusy(true);
    void api.unlink("google").then((outcome) => {
      setBusy(false);
      if (outcome.ok) onDone("Google n'est plus lié à votre compte.");
      else notify(outcome.message, false);
    });
  };

  return (
    <SettingRow
      label="Google"
      value={linked ? "Lié" : "Non lié"}
      description={
        linked
          ? removable
            ? "Vous pouvez vous connecter avec Google."
            : "Seule méthode de connexion : définissez un mot de passe avant de le retirer."
          : "Se connecter en un clic, sans mot de passe."
      }
      action={
        linked ? (
          <Button size="sm" disabled={readOnly || busy || !removable} onClick={unlink}>
            Retirer
          </Button>
        ) : (
          <Button size="sm" icon="link" disabled={readOnly || busy} onClick={link}>
            Lier
          </Button>
        )
      }
    />
  );
}

/** Le réglage qui ouvre ou ferme ses parties aux amis qui voudraient les regarder. */
function SpectatorsCard({ profile, readOnly, onDone }: { profile: MeProfile; readOnly: boolean; onDone: (message: string) => void }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = () => {
    setBusy(true);
    void friends.allowSpectators(!profile.allowSpectators).then((outcome) => {
      setBusy(false);
      if (!outcome.ok) notify(outcome.message, false);
      else onDone(outcome.value.allowSpectators ? "Vos amis peuvent regarder vos parties." : "Vos parties ne se regardent plus.");
    });
  };
  return (
    <Card title="Amis">
      <SettingList>
        <SettingRow
          label="Spectateurs"
          value={profile.allowSpectators ? "Autorisés" : "Refusés"}
          description="Un ami qui regarde ne voit que ce que vous voyez, en direct — jamais la position adverse."
          action={
            <Button size="sm" disabled={readOnly || busy} onClick={toggle}>
              {profile.allowSpectators ? "Refuser" : "Autoriser"}
            </Button>
          }
        />
      </SettingList>
    </Card>
  );
}

function Sessions({ readOnly }: { readOnly: boolean }) {
  const notify = useToast();
  const { loaded, reload } = useLoad("sessions", api.sessions);

  const revoke = async (pending: Promise<{ ok: boolean; message?: string }>, done: string) => {
    const outcome = await pending;
    notify(outcome.ok ? done : (outcome.message ?? "La demande a échoué."), outcome.ok);
    if (outcome.ok) reload();
  };

  const list: readonly MeSession[] = loaded.state === "ready" ? loaded.value : [];
  const others = list.filter((session) => !session.current).length;
  return (
    <Card
      title={`Sessions ouvertes (${list.length})`}
      action={
        others > 0 && (
          <Button size="sm" icon="logout" disabled={readOnly} onClick={() => void revoke(api.revokeOtherSessions(), "Les autres sessions sont fermées.")}>
            fermer les autres
          </Button>
        )
      }
    >
      {loaded.state === "failed" ? (
        <EmptyState error>{loaded.message}</EmptyState>
      ) : (
        <List>
          {list.map((session) => (
            <ListRow
              key={session.id}
              end={
                session.current ? (
                  <Badge tone="strong">cet appareil</Badge>
                ) : (
                  <IconButton
                    icon="close"
                    label="Fermer cette session"
                    tipAlign="end"
                    disabled={readOnly}
                    onClick={() => void revoke(api.revokeSession(session.id), "Session fermée.")}
                  />
                )
              }
            >
              <strong>
                {shortAgent(session.userAgent)}
                {session.impersonated && " · emprunt (administrateur)"}
              </strong>
              <small>
                {session.ipAddress ?? "IP inconnue"} · active {sinceLabel(session.lastActiveAt, Date.now())} · ouverte le{" "}
                {formatDate(session.createdAt)}
              </small>
            </ListRow>
          ))}
        </List>
      )}
    </Card>
  );
}

function DangerZone({ profile, readOnly }: { profile: MeProfile; readOnly: boolean }) {
  const notify = useToast();
  const [open, setOpen] = useState(false);
  return (
    <Card title="Zone sensible">
      <SettingList>
        <SettingRow
          label="Supprimer le compte"
          value="Définitif."
          description="Adresse, sessions et connexions effacées. Vos parties restent rejouables par vos adversaires, sous un pseudo anonyme."
          action={
            <Button size="sm" variant="danger" icon="trash" disabled={readOnly} onClick={() => setOpen(true)}>
              Supprimer…
            </Button>
          }
        />
      </SettingList>
      <Dialog
        open={open}
        title="Supprimer le compte"
        confirmLabel="Envoyer le lien"
        danger
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          const outcome = await api.requestDeletion();
          notify(outcome.ok ? `Lien de confirmation envoyé à ${profile.email}. Il expire dans 24 heures.` : outcome.message, outcome.ok);
          return outcome.ok;
        }}
      >
        Un lien vous sera envoyé à {profile.email}. Le compte n'est supprimé qu'à son ouverture, dans ce navigateur. La
        suppression est définitive.
      </Dialog>
    </Card>
  );
}

// --- Parties --------------------------------------------------------------------------

function Matches({ offset, readOnly }: { offset: number; readOnly: boolean }) {
  const notify = useToast();
  const { loaded } = useLoad(`matches:${offset}`, () => api.matches(offset));
  if (loaded.state === "loading") return null;
  if (loaded.state === "failed") return <EmptyState error>{loaded.message}</EmptyState>;
  const page = loaded.value;
  return (
    <Card title={`Mes parties (${page.total})`}>
      <MatchTable
        matches={page.matches}
        replayHref={(m) => profileHash({ view: "match", id: m.id })}
        readOnly={readOnly}
        onAddFriend={(m) =>
          void friends.requestFriend(m.opponentId).then((outcome) => {
            if (!outcome.ok) notify(outcome.message, false);
            else notify(outcome.value.relation === "friend" ? `${m.opponent} et vous êtes amis.` : `Demande envoyée à ${m.opponent}.`);
          })
        }
      />
      <Pager
        offset={offset}
        shown={page.matches.length}
        total={page.total}
        pageSize={api.PAGE_SIZE}
        hrefFor={(next) => profileHash({ view: "matches", offset: next })}
      />
    </Card>
  );
}

function MatchReplay({ id }: { id: string }) {
  const { loaded } = useLoad(`match:${id}`, () => api.match(id));
  if (loaded.state === "loading") return null;
  if (loaded.state === "failed") return <EmptyState error>{loaded.message}</EmptyState>;
  return <MatchReplayView match={loaded.value} back={{ href: profileHash({ view: "matches", offset: 0 }), label: "Mes parties" }} self="vous" />;
}
