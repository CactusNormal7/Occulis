import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BackLink,
  Badge,
  Banner,
  Button,
  Card,
  CardColumn,
  CardGrid,
  Dialog,
  EmptyState,
  FactStrip,
  Hero,
  IconButton,
  List,
  ListRow,
  Note,
  Pager,
  PasswordField,
  ProgressBar,
  QuickBar,
  SettingEditor,
  SettingList,
  SettingRow,
  Stat,
  StatGrid,
  Table,
  TextField,
  TileAvatar,
  ToastProvider,
  Toolbar,
  ToolbarText,
  TopBar,
  LocaleSwitch,
  UiRoot,
  useMessages,
  useToast,
} from "@occulis/ui";
import type { MeMatchDetail, MeMatchSummary, MeProfile, MeSession } from "@occulis/protocol";
import { boardForScenario } from "../game/scenario.js";
import { linkGoogle, stopImpersonating } from "../net/auth.js";
import { useLoad, type Loaded } from "../admin/hooks.js";
import { ReplayBoard } from "../admin/ReplayBoard.js";
import { clampFrame } from "../admin/replay.js";
import { formatDate, shortAgent, winRate } from "../admin/model.js";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, passwordHint } from "../account/model.js";
import { chooseLocale, initLocale } from "../i18n/browser.js";
import { ROUTE_PATHS } from "../net/auth.js";
import * as api from "./api.js";
import {
  arrivalMessage,
  asBoardFrames,
  canUnlink,
  describeMyResult,
  handleCooldownLabel,
  parseProfileRoute,
  profileHash,
  sinceLabel,
  type ProfileRoute,
} from "./model.js";

/**
 * La page de profil, servie sous `/profile/` : le pendant du back-office, pour son propre
 * compte. En React sur `@occulis/ui`, sans classe ni couleur propres.
 *
 * Tout ce que la page grise, le serveur le refuse aussi : l'identité vient du cookie,
 * chaque requête est bornée au compte de la session, et une session d'emprunt n'y
 * modifie rien (`apps/server/src/me/routes.ts`, `auth/better-auth.ts`).
 */
export function App() {
  const [locale, setLocale] = useState(initLocale);
  return (
    <UiRoot fullPage locale={locale}>
      <Page
        localeSwitch={
          <LocaleSwitch
            value={locale}
            onChange={(next) => {
              chooseLocale(next);
              setLocale(next);
            }}
          />
        }
      />
    </UiRoot>
  );
}

function Page({ localeSwitch }: { localeSwitch: ReactNode }) {
  const m = useMessages().profile;
  const route = useProfileRoute();
  const { loaded, reload } = useLoad("profile", api.profile);
  const signedIn = loaded.state === "ready";

  return (
    <ToastProvider>
      <ProgressBar active={loaded.state === "loading"} />
      <TopBar
        section={m.section}
        brandHref="/"
        tabs={
          signedIn
            ? [
                { href: profileHash({ view: "account" }), label: m.tabs.account, current: route.view === "account" },
                { href: profileHash({ view: "matches", offset: 0 }), label: m.tabs.matches, current: route.view !== "account" },
              ]
            : []
        }
        end={
          <>
            {localeSwitch}
            {loaded.state === "ready" && <span>{loaded.value.handle}</span>}
            <a href="/">{m.backToGame}</a>
          </>
        }
      />
      <main className="occ-page">
        <Gate loaded={loaded} route={route} reload={reload} />
      </main>
    </ToastProvider>
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
  const m = useMessages().profile;
  if (loaded.state === "loading") return null;
  if (loaded.state === "failed") {
    return <EmptyState action={<a href={ROUTE_PATHS.signin}>{m.signIn}</a>}>{loaded.message}</EmptyState>;
  }
  const profile = loaded.value;
  return (
    <div key={profileHash(route)} className="occ-stack occ-enter">
      {profile.impersonating && (
        <Banner
          icon="impersonate"
          action={
            <Button variant="danger" onClick={() => void stopImpersonating().then(() => location.assign("/admin/"))}>
              {m.impersonation.stop}
            </Button>
          }
        >
          {m.impersonation.text}
        </Banner>
      )}
      {route.view === "account" && <Account profile={profile} reload={reload} />}
      {route.view === "matches" && <Matches offset={route.offset} />}
      {route.view === "match" && <MatchReplay id={route.id} />}
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
  const m = useMessages().profile;
  const notify = useToast();
  const readOnly = profile.impersonating;
  const [editing, setEditing] = useState<Editing>(null);

  // Le message d'une redirection (bienvenue Google, liaison) est lu une fois, puis retiré
  // de l'URL pour ne pas réapparaître à chaque rechargement.
  useEffect(() => {
    const arrival = arrivalMessage(location.search);
    if (arrival !== undefined) notify(arrival.text, arrival.ok);
    if (location.search.length > 0) history.replaceState(null, "", `${location.pathname}${location.hash}`);
    if (location.hash === "#security") document.getElementById("security")?.scrollIntoView();
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
        badges={profile.emailVerified ? <Badge>{m.verified}</Badge> : <Badge tone="dim">{m.unverified}</Badge>}
        meta={[profile.email, m.memberSince(formatDate(profile.createdAt))]}
      />
      {!profile.emailVerified && <VerifyBanner profile={profile} readOnly={readOnly} />}
      <CardGrid>
        <CardColumn>
          <Card title={m.account.title}>
            <SettingList>
              <SettingRow
                label={m.account.handle}
                value={profile.handle}
                description={cooldown ?? m.account.handleDescription}
                onEdit={edit("handle")}
                editDisabled={cooldown !== undefined}
                editing={editing === "handle"}
              >
                <HandleEditor current={profile.handle} onDone={done} onCancel={cancel} />
              </SettingRow>
              <SettingRow
                label={m.account.email}
                value={profile.email}
                description={profile.emailVerified ? m.account.emailVerified : m.account.emailUnverified}
                onEdit={edit("email")}
                editing={editing === "email"}
              >
                <EmailEditor profile={profile} onDone={done} onCancel={cancel} />
              </SettingRow>
            </SettingList>
          </Card>
          <RecordCard profile={profile} />
        </CardColumn>
        <CardColumn>
          <Card title={m.security.title} id="security">
            <SettingList>
              <SettingRow
                label={m.security.password}
                value={profile.hasPassword ? "••••••••••" : m.security.none}
                description={profile.hasPassword ? undefined : m.security.googleOnly}
                editLabel={profile.hasPassword ? m.security.change : m.security.set}
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
  const m = useMessages().profile.verify;
  const notify = useToast();
  const [sent, setSent] = useState(false);
  const resend = () =>
    void api.resendVerification(profile.email).then((outcome) => {
      notify(outcome.ok ? m.resent(profile.email) : outcome.message, outcome.ok);
      if (outcome.ok) setSent(true);
    });
  return (
    <Banner
      icon="mail"
      action={
        <Button disabled={readOnly || sent} onClick={resend}>
          {sent ? m.sent : m.resend}
        </Button>
      }
    >
      {m.text}
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
  const m = useMessages().profile;
  const { busy, error, run } = useEditor(onDone);
  const [value, setValue] = useState(current);
  return (
    <SettingEditor
      submitLabel={m.save}
      busy={busy}
      error={error}
      onCancel={onCancel}
      onSubmit={() => run(api.changeHandle(value), m.handleEditor.done)}
      note={m.handleEditor.note}
    >
      <TextField
        label={m.handleEditor.label}
        name="handle"
        autoComplete="nickname"
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={2}
        maxLength={24}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        hint={m.handleEditor.hint}
      />
    </SettingEditor>
  );
}

function EmailEditor({ profile, onDone, onCancel }: EditorProps & { profile: MeProfile }) {
  const m = useMessages().profile;
  const { busy, error, run } = useEditor(onDone);
  const [value, setValue] = useState("");
  const address = value.trim();
  return (
    <SettingEditor
      submitLabel={m.sendLink}
      busy={busy}
      error={error}
      onCancel={onCancel}
      onSubmit={() =>
        run(
          api.changeEmail(address),
          profile.emailVerified ? m.emailEditor.doneVerified(profile.email) : m.emailEditor.doneUnverified(address),
        )
      }
      note={profile.emailVerified ? m.emailEditor.noteVerified(profile.email) : m.emailEditor.noteUnverified}
    >
      <TextField
        label={m.emailEditor.label}
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
  const m = useMessages().profile.passwordEditor;
  const { busy, error, run } = useEditor(onDone);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  return (
    <SettingEditor
      id="password-form"
      method="post"
      action="/api/auth/change-password"
      submitLabel={m.submit}
      busy={busy}
      error={error}
      onCancel={onCancel}
      onSubmit={() => run(api.changePassword(current, next), m.done)}
      note={m.note}
    >
      <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
      <PasswordField
        label={m.current}
        name="current-password"
        autoComplete="current-password"
        required
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
      />
      <PasswordField
        label={m.next}
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
  const m = useMessages().profile;
  const { busy, error, run } = useEditor(onDone);
  return (
    <SettingEditor
      submitLabel={m.sendLink}
      busy={busy}
      error={error}
      onCancel={onCancel}
      onSubmit={() => run(api.requestPasswordSetup(email), m.passwordSetup.done(email))}
    >
      <Note>{m.passwordSetup.note(email)}</Note>
    </SettingEditor>
  );
}

function GoogleSetting({ profile, readOnly, onDone }: { profile: MeProfile; readOnly: boolean; onDone: (message: string) => void }) {
  const m = useMessages().profile.google;
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
      if (outcome.ok) onDone(m.unlinked);
      else notify(outcome.message, false);
    });
  };

  return (
    <SettingRow
      label="Google"
      value={linked ? m.linked : m.notLinked}
      description={linked ? (removable ? m.canSignIn : m.onlyMethod) : m.oneClick}
      action={
        linked ? (
          <Button size="sm" disabled={readOnly || busy || !removable} onClick={unlink}>
            {m.remove}
          </Button>
        ) : (
          <Button size="sm" icon="link" disabled={readOnly || busy} onClick={link}>
            {m.link}
          </Button>
        )
      }
    />
  );
}

function RecordCard({ profile }: { profile: MeProfile }) {
  const m = useMessages().profile.record;
  const { played, won, lost, ongoing } = profile.record;
  const rate = winRate(profile.record);
  return (
    <Card title={m.title} action={<a href={profileHash({ view: "matches", offset: 0 })}>{m.history}</a>}>
      <StatGrid>
        <Stat value={played} label={m.played} />
        <Stat value={won} label={m.won} />
        <Stat value={lost} label={m.lost} />
        <Stat value={ongoing} label={m.ongoing} />
        <Stat value={rate === null ? "—" : `${rate} %`} label={m.rate} />
      </StatGrid>
    </Card>
  );
}

function Sessions({ readOnly }: { readOnly: boolean }) {
  const m = useMessages().profile.sessions;
  const notify = useToast();
  const { loaded, reload } = useLoad("sessions", api.sessions);

  const revoke = async (pending: Promise<{ ok: boolean; message?: string }>, done: string) => {
    const outcome = await pending;
    notify(outcome.ok ? done : (outcome.message ?? m.failed), outcome.ok);
    if (outcome.ok) reload();
  };

  const list: readonly MeSession[] = loaded.state === "ready" ? loaded.value : [];
  const others = list.filter((session) => !session.current).length;
  return (
    <Card
      title={m.title(list.length)}
      action={
        others > 0 && (
          <Button size="sm" icon="logout" disabled={readOnly} onClick={() => void revoke(api.revokeOtherSessions(), m.othersClosed)}>
            {m.closeOthers}
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
                  <Badge tone="strong">{m.thisDevice}</Badge>
                ) : (
                  <IconButton
                    icon="close"
                    label={m.close}
                    tipAlign="end"
                    disabled={readOnly}
                    onClick={() => void revoke(api.revokeSession(session.id), m.closed)}
                  />
                )
              }
            >
              <strong>
                {shortAgent(session.userAgent)}
                {session.impersonated && m.impersonated}
              </strong>
              <small>{m.line(session.ipAddress ?? m.unknownIp, sinceLabel(session.lastActiveAt, Date.now()), formatDate(session.createdAt))}</small>
            </ListRow>
          ))}
        </List>
      )}
    </Card>
  );
}

function DangerZone({ profile, readOnly }: { profile: MeProfile; readOnly: boolean }) {
  const all = useMessages().profile;
  const m = all.danger;
  const notify = useToast();
  const [open, setOpen] = useState(false);
  return (
    <Card title={m.title}>
      <SettingList>
        <SettingRow
          label={m.delete}
          value={m.final}
          description={m.description}
          action={
            <Button size="sm" variant="danger" icon="trash" disabled={readOnly} onClick={() => setOpen(true)}>
              {m.deleteButton}
            </Button>
          }
        />
      </SettingList>
      <Dialog
        open={open}
        title={m.delete}
        confirmLabel={all.sendLink}
        danger
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          const outcome = await api.requestDeletion();
          notify(outcome.ok ? m.sent(profile.email) : outcome.message, outcome.ok);
          return outcome.ok;
        }}
      >
        {m.dialog(profile.email)}
      </Dialog>
    </Card>
  );
}

// --- Parties --------------------------------------------------------------------------

function Matches({ offset }: { offset: number }) {
  const m = useMessages().profile.matches;
  const { loaded } = useLoad(`matches:${offset}`, () => api.matches(offset));
  if (loaded.state === "loading") return null;
  if (loaded.state === "failed") return <EmptyState error>{loaded.message}</EmptyState>;
  const page = loaded.value;
  return (
    <Card title={m.title(page.total)}>
      <MyMatchTable matches={page.matches} />
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

function MyResult({ match }: { match: Pick<MeMatchSummary, "result" | "outcome" | "seat"> }) {
  const m = useMessages().profile.results;
  if (match.result === "ongoing") return <Badge tone="dim">{m.ongoing}</Badge>;
  // La couleur du camp vainqueur : c'est une information de partie.
  const winner = match.outcome?.winner;
  return <Badge tone={winner ?? "plain"}>{describeMyResult(match)}</Badge>;
}

function MyMatchTable({ matches }: { matches: readonly MeMatchSummary[] }) {
  const t = useMessages().profile.matches;
  const c = t.columns;
  return (
    <Table columns={[c.start, c.opponent, c.side, c.result, c.moves, ""]} rowCount={matches.length} empty={t.empty}>
      {matches.map((m) => (
        <tr key={m.id}>
          <td className="occ-muted">{formatDate(m.startedAt)}</td>
          <td>{m.opponent}</td>
          <td>
            <Badge tone={m.seat}>{m.seat}</Badge>
          </td>
          <td>
            <MyResult match={m} />
          </td>
          <td className="occ-muted">{m.actions}</td>
          <td className="occ-actions-cell">
            <IconButton
              icon="eye"
              label={m.result === "ongoing" ? t.ongoingReplay : t.replay}
              tipAlign="end"
              disabled={m.result === "ongoing"}
              onClick={() => (location.hash = profileHash({ view: "match", id: m.id }))}
            />
          </td>
        </tr>
      ))}
    </Table>
  );
}

function MatchReplay({ id }: { id: string }) {
  const t = useMessages().profile.matches;
  const { loaded } = useLoad(`match:${id}`, () => api.match(id));
  if (loaded.state === "loading") return null;
  if (loaded.state === "failed") return <EmptyState error>{loaded.message}</EmptyState>;
  const m = loaded.value;
  return (
    <>
      <BackLink href={profileHash({ view: "matches", offset: 0 })}>{t.back}</BackLink>
      <Hero title={t.against(m.opponent)} badges={<MyResult match={m} />} meta={[t.side(m.seat), formatDate(m.startedAt)]} />
      <FactStrip
        facts={[
          { label: t.facts.start, value: formatDate(m.startedAt) },
          { label: t.facts.end, value: formatDate(m.finishedAt) },
          { label: t.facts.rules, value: m.rulesetVersion },
          { label: t.facts.map, value: m.scenario },
          { label: t.facts.moves, value: String(m.log.length) },
        ]}
      />
      {m.replayError !== null && <Banner>{t.replayError(m.replayError)}</Banner>}
      <Replay match={m} />
    </>
  );
}

/**
 * Le plateau rejoué **de votre point de vue** : vos pièces, les pièces adverses que vous
 * voyiez, et rien d'autre. Les coups adverses ne sont pas détaillés, leur position
 * restant inconnue de votre camp.
 */
function Replay({ match: m }: { match: MeMatchDetail }) {
  const t = useMessages().profile;
  const count = m.frames.length;
  const [index, setIndex] = useState(count - 1);
  const [turns, setTurns] = useState(0);
  const frames = useMemo(() => asBoardFrames(m.frames, m.seat), [m.frames, m.seat]);
  const board = useMemo(() => {
    try {
      return boardForScenario(m.scenario);
    } catch {
      return undefined;
    }
  }, [m.scenario]);

  const go = (next: number) => setIndex(clampFrame(next, count));
  const entry = index === 0 ? undefined : m.log[index - 1];
  const label =
    index === 0
      ? t.replay.start
      : t.replay.move(index, m.log.length, entry?.player === m.seat ? t.replay.you : m.opponent, entry?.action?.kind === "resign");

  if (board === undefined) {
    return <EmptyState>{t.replay.unknownMap(m.scenario)}</EmptyState>;
  }
  const c = t.replayControls;
  return (
    <Card title={t.replay.title} flush>
      <Toolbar>
        <QuickBar>
          <IconButton icon="first" label={c.first} onClick={() => go(0)} />
          <IconButton icon="previous" label={c.previous} onClick={() => go(index - 1)} />
          <IconButton icon="next" label={c.next} onClick={() => go(index + 1)} />
          <IconButton icon="last" label={c.last} onClick={() => go(count - 1)} />
        </QuickBar>
        <ToolbarText>{label}</ToolbarText>
        <QuickBar>
          <IconButton icon="rotateLeft" label={c.rotate} onClick={() => setTurns(turns - 1)} />
          <IconButton icon="rotateRight" label={c.rotate} onClick={() => setTurns(turns + 1)} />
        </QuickBar>
      </Toolbar>
      <ReplayBoard board={board} frames={frames} index={index} perspective={m.seat} turns={turns} />
    </Card>
  );
}
