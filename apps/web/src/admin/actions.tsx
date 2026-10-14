import { useState } from "react";
import { ChipGroup, Dialog, IconButton, Note, QuickBar, SelectField, TextField, useMessages, useToast, type IconName } from "@occulis/ui";
import * as api from "./api.js";
import { banDuration, banPresets, isAdminRole, quickActions, routeHash, type QuickAction, type Route } from "./model.js";

/**
 * Les actions rapides d'un compte et leurs fenêtres de confirmation, les mêmes dans la
 * liste et sur la fiche : un geste se retrouve au même endroit d'une vue à l'autre.
 * `quickActions()` (pur, testé) dit lesquelles sont fermées et pourquoi.
 */

export interface QuickUser {
  readonly id: string;
  readonly name: string;
  readonly role?: string | null | undefined;
  readonly emailVerified: boolean;
  readonly banned?: boolean | null | undefined;
}

/** Joue un geste, annonce son résultat, et relit la vue s'il a réussi. */
export function useAct(reload: () => void) {
  const notify = useToast();
  return async (pending: Promise<api.Outcome<unknown>>, done: string): Promise<boolean> => {
    const outcome = await pending;
    notify(outcome.ok ? done : outcome.message, outcome.ok);
    if (outcome.ok) reload();
    return outcome.ok;
  };
}

/** Change de route en annonçant un résultat, qui survit à la navigation. */
export function useGo() {
  const notify = useToast();
  return (route: Route, message: string) => {
    notify(message, true);
    location.hash = routeHash(route);
  };
}

const ICONS: Record<QuickAction["kind"], IconName> = {
  view: "eye",
  verify: "mail",
  role: "shield",
  ban: "ban",
  impersonate: "impersonate",
  revoke: "logout",
  delete: "trash",
};

type Open = "ban" | "delete" | "impersonate" | "promote" | null;

export interface QuickActionsProps {
  user: QuickUser;
  /** Le pseudo de l'administrateur connecté : ce qu'il ne peut pas se faire est grisé. */
  self: string;
  reload: () => void;
  /** Après une suppression réussie. */
  onDeleted: () => void;
  framed?: boolean;
}

export function QuickActions({ user, self, reload, onDeleted, framed = false }: QuickActionsProps) {
  const m = useMessages().admin.actions;
  const act = useAct(reload);
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const banned = user.banned === true;

  const run = (kind: QuickAction["kind"]) => {
    switch (kind) {
      case "view":
        location.hash = routeHash({ view: "user", id: user.id });
        return;
      case "verify":
        void act(api.update(user.id, { emailVerified: !user.emailVerified }), m.verificationChanged);
        return;
      case "role":
        if (isAdminRole(user.role)) void act(api.setRole(user.id, "user"), m.demoted(user.name));
        else setOpen("promote");
        return;
      case "ban":
        if (banned) void act(api.unban(user.id), m.unbanned(user.name));
        else setOpen("ban");
        return;
      case "impersonate":
        setOpen("impersonate");
        return;
      case "revoke":
        void act(api.revokeSessions(user.id), m.revoked(user.name));
        return;
      case "delete":
        setOpen("delete");
        return;
    }
  };

  return (
    <>
      <QuickBar framed={framed}>
        {quickActions(user, self)
          .filter((action) => action.kind !== "view")
          .map((action) => (
            <IconButton
              key={action.kind}
              icon={action.kind === "ban" && banned ? "unban" : ICONS[action.kind]}
              label={action.label}
              danger={action.danger === true}
              disabledReason={action.disabled}
              onClick={() => run(action.kind)}
            />
          ))}
      </QuickBar>
      {open === "ban" && <BanDialog user={user} act={act} onClose={close} />}
      {open === "delete" && <DeleteDialog user={user} onDeleted={onDeleted} onClose={close} />}
      {open === "impersonate" && <ImpersonateDialog user={user} onClose={close} />}
      {open === "promote" && (
        <Dialog
          open
          title={m.promoteTitle(user.name)}
          confirmLabel={m.promote}
          onConfirm={() => act(api.setRole(user.id, "admin"), m.promoted(user.name))}
          onClose={close}
        >
          <Note>{m.promoteNote}</Note>
        </Dialog>
      )}
    </>
  );
}

type Act = ReturnType<typeof useAct>;

function BanDialog({ user, act, onClose }: { user: QuickUser; act: Act; onClose: () => void }) {
  const m = useMessages().admin.actions;
  const presets = banPresets();
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("");
  const duration = banDuration(days);
  return (
    <Dialog
      open
      title={m.banTitle(user.name)}
      confirmLabel={m.ban}
      danger
      ready={duration.ok}
      onConfirm={() =>
        duration.ok ? act(api.ban(user.id, reason, duration.seconds), m.banned(user.name)) : false
      }
      onClose={onClose}
    >
      <Note>{m.banNote}</Note>
      <TextField label={m.reason} value={reason} onChange={(event) => setReason(event.target.value)} />
      <ChipGroup
        options={presets.map((preset) => ({ value: preset.days, label: preset.label }))}
        value={presets.some((preset) => preset.days === days) ? days : undefined}
        onChange={setDays}
      />
      <TextField
        label={m.days}
        placeholder={m.daysPlaceholder}
        value={days}
        onChange={(event) => setDays(event.target.value)}
        hint={duration.ok ? undefined : m.daysHint}
      />
    </Dialog>
  );
}

/**
 * La suppression demande de retaper le pseudo : un bouton « OK » se valide d'un réflexe,
 * et ce geste-ci ne se défait pas.
 */
function DeleteDialog({ user, onDeleted, onClose }: { user: QuickUser; onDeleted: () => void; onClose: () => void }) {
  const m = useMessages().admin.actions;
  const notify = useToast();
  const [check, setCheck] = useState("");
  return (
    <Dialog
      open
      title={m.deleteTitle(user.name)}
      confirmLabel={m.deleteConfirm}
      danger
      ready={check === user.name}
      onConfirm={async () => {
        const outcome = await api.remove(user.id);
        if (!outcome.ok) {
          notify(outcome.message, false);
          return false;
        }
        onDeleted();
        return true;
      }}
      onClose={onClose}
    >
      <Note>{m.deleteNote}</Note>
      <TextField label={m.retype(user.name)} value={check} onChange={(event) => setCheck(event.target.value)} />
    </Dialog>
  );
}

function ImpersonateDialog({ user, onClose }: { user: QuickUser; onClose: () => void }) {
  const m = useMessages().admin.actions;
  const notify = useToast();
  return (
    <Dialog
      open
      title={m.impersonateTitle(user.name)}
      confirmLabel={m.impersonateConfirm}
      onConfirm={async () => {
        const outcome = await api.impersonate(user.id);
        if (!outcome.ok) {
          notify(outcome.message, false);
          return false;
        }
        location.assign("/");
        return true;
      }}
      onClose={onClose}
    >
      <Note>{m.impersonateNote}</Note>
      <Note>{m.impersonateWarning}</Note>
    </Dialog>
  );
}

/** La création d'un compte, depuis la liste. */
export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const m = useMessages().admin.actions;
  const notify = useToast();
  const go = useGo();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  return (
    <Dialog
      open
      title={m.createTitle}
      confirmLabel={m.create}
      ready={name.trim().length >= 2 && email.includes("@") && password.length > 0}
      onConfirm={async () => {
        const result = await api.create(email, password, name, role);
        if (!result.ok) {
          notify(result.message, false);
          return false;
        }
        go({ view: "user", id: result.value.user.id }, m.created(result.value.user.name));
        return true;
      }}
      onClose={onClose}
    >
      <TextField label={m.handle} value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label={m.address} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField label={m.password} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <SelectField
        label={m.role}
        value={role}
        onChange={(event) => setRole(event.target.value)}
        options={[
          { value: "user", label: m.roles.user },
          { value: "admin", label: m.roles.admin },
        ]}
      />
      <Note>{m.createNote}</Note>
    </Dialog>
  );
}
