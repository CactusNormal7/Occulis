import { useEffect, useState } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  CardColumn,
  CardGrid,
  ChoiceList,
  ChoiceRow,
  Dialog,
  EmptyState,
  Hero,
  IconButton,
  List,
  ListRow,
  Note,
  SettingList,
  SettingRow,
  TileAvatar,
  useMessages,
  useToast,
} from "@occulis/ui";
import type { MeProfile, MeSession } from "@occulis/protocol";
import { linkGoogle } from "../net/auth.js";
import { useLoad } from "../load/hooks.js";
import { formatDate, shortAgent } from "../admin/model.js";
import * as resources from "./resources.js";
import * as api from "./api.js";
import * as friends from "../social/api.js";
import { RecordCard } from "./parts.js";
import {
  arrivalMessage,
  canUnlink,
  handleCooldownLabel,
  profileHash,
  sinceLabel,
} from "./model.js";
import {
  EmailEditor,
  HandleEditor,
  PasswordEditor,
  PasswordSetupEditor,
} from "./account-editors.js";

// --- Compte ---------------------------------------------------------------------------

/** Le réglage dont l'éditeur est ouvert : un seul à la fois. */
type Editing = "handle" | "email" | "password" | null;

/**
 * La vue du compte : des réglages **en lecture d'abord**, chacun avec son bouton. Rien
 * n'est un champ tant qu'on n'a pas demandé à le modifier, et un seul éditeur est ouvert
 * à la fois — ce qu'on change reste lisible, à côté de ce qu'on ne change pas.
 */
export function Account({ profile, reload }: { profile: MeProfile; reload: () => void }) {
  const m = useMessages().profile;
  const notify = useToast();
  const readOnly = profile.impersonating;
  const [editing, setEditing] = useState<Editing>(null);

  // Le message d'une redirection (bienvenue Google, liaison) est lu une fois, puis retiré
  // de l'URL pour ne pas réapparaître à chaque rechargement.
  useEffect(() => {
    const arrival = arrivalMessage(location.search);
    if (arrival !== undefined) notify(arrival.text, arrival.ok);
    if (location.search.length > 0)
      history.replaceState(null, "", `${location.pathname}${location.hash}`);
    if (location.hash === "#security") document.getElementById("security")?.scrollIntoView();
    // Au montage seulement : c'est l'URL d'arrivée qu'on lit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        badges={
          profile.emailVerified ? (
            <Badge>{m.verified}</Badge>
          ) : (
            <Badge tone="dim">{m.unverified}</Badge>
          )
        }
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
                description={
                  profile.emailVerified ? m.account.emailVerified : m.account.emailUnverified
                }
                onEdit={edit("email")}
                editing={editing === "email"}
              >
                <EmailEditor profile={profile} onDone={done} onCancel={cancel} />
              </SettingRow>
            </SettingList>
          </Card>
          <RecordCard
            record={profile.record}
            elo={profile.elo}
            action={<a href={profileHash({ view: "matches", offset: 0 })}>{m.record.history}</a>}
          />
          <FeatsCard readOnly={readOnly} />
          <SpectatorsCard profile={profile} readOnly={readOnly} onDone={done} />
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
              {(profile.availableProviders.includes("google") ||
                profile.providers.includes("google")) && (
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

function GoogleSetting({
  profile,
  readOnly,
  onDone,
}: {
  profile: MeProfile;
  readOnly: boolean;
  onDone: (message: string) => void;
}) {
  const m = useMessages().profile.google;
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const linked = profile.providers.includes("google");
  const removable = canUnlink(profile, "google");
  let description = m.oneClick;
  if (linked) description = removable ? m.canSignIn : m.onlyMethod;

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
      description={description}
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

/**
 * Les faits d'armes : ceux débloqués, et les trois au plus qu'on montre à ses adversaires
 * à l'annonce d'une partie. Le serveur refuse ce qui n'est pas débloqué ; griser n'évite
 * qu'un clic dans le vide.
 */
function FeatsCard({ readOnly }: { readOnly: boolean }) {
  const all = useMessages();
  const m = all.feats;
  const notify = useToast();
  const { loaded, reload } = useLoad(resources.feats);
  if (loaded.state === "failed") return <EmptyState error>{loaded.message}</EmptyState>;
  const { feats, showcase } = loaded.value;
  const full = showcase.length >= 3;
  const toggle = (id: string) => {
    const next = showcase.includes(id)
      ? showcase.filter((other) => other !== id)
      : [...showcase, id];
    void api.setShowcase(next).then((outcome) => {
      notify(outcome.ok ? m.saved : outcome.message, outcome.ok);
      if (outcome.ok) reload();
    });
  };
  return (
    <Card title={m.title}>
      <Note>{m.lead}</Note>
      <ChoiceList label={m.title}>
        {feats.map((feat) => {
          const shown = showcase.includes(feat.id);
          return (
            <ChoiceRow
              key={feat.id}
              muted={!feat.unlocked}
              end={
                !feat.unlocked ? (
                  <Badge tone="dim">{m.locked}</Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={readOnly || (!shown && full)}
                    title={!shown && full ? m.full : undefined}
                    onClick={() => toggle(feat.id)}
                  >
                    {shown ? m.hide : m.show}
                  </Button>
                )
              }
            >
              <strong>
                {m.names[feat.id] ?? feat.id}
                {shown && ` · ${m.shown}`}
              </strong>
              <small>{m.descriptions[feat.id] ?? ""}</small>
            </ChoiceRow>
          );
        })}
      </ChoiceList>
    </Card>
  );
}

/** Le réglage qui ouvre ou ferme ses parties aux amis qui voudraient les regarder. */
function SpectatorsCard({
  profile,
  readOnly,
  onDone,
}: {
  profile: MeProfile;
  readOnly: boolean;
  onDone: (message: string) => void;
}) {
  const m = useMessages().social.spectators;
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = () => {
    setBusy(true);
    void friends.allowSpectators(!profile.allowSpectators).then((outcome) => {
      setBusy(false);
      if (!outcome.ok) notify(outcome.message, false);
      else onDone(outcome.value.allowSpectators ? m.nowAllowed : m.nowRefused);
    });
  };
  return (
    <Card title={m.title}>
      <SettingList>
        <SettingRow
          label={m.label}
          value={profile.allowSpectators ? m.allowed : m.refused}
          description={m.description}
          action={
            <Button size="sm" disabled={readOnly || busy} onClick={toggle}>
              {profile.allowSpectators ? m.refuse : m.allow}
            </Button>
          }
        />
      </SettingList>
    </Card>
  );
}

function Sessions({ readOnly }: { readOnly: boolean }) {
  const m = useMessages().profile.sessions;
  const notify = useToast();
  const { loaded, reload } = useLoad(resources.sessions);

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
          <Button
            size="sm"
            icon="logout"
            disabled={readOnly}
            onClick={() => void revoke(api.revokeOtherSessions(), m.othersClosed)}
          >
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
              <small>
                {m.line(
                  session.ipAddress ?? m.unknownIp,
                  sinceLabel(session.lastActiveAt, Date.now()),
                  formatDate(session.createdAt),
                )}
              </small>
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
            <Button
              size="sm"
              variant="danger"
              icon="trash"
              disabled={readOnly}
              onClick={() => setOpen(true)}
            >
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
