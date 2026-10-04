import { useState } from "react";
import { ChipGroup, Dialog, IconButton, Note, QuickBar, SelectField, TextField, useToast, type IconName } from "@occulis/ui";
import * as api from "./api.js";
import { BAN_PRESETS, banDuration, isAdminRole, quickActions, routeHash, type QuickAction, type Route } from "./model.js";

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
        void act(api.update(user.id, { emailVerified: !user.emailVerified }), "Vérification modifiée.");
        return;
      case "role":
        if (isAdminRole(user.role)) void act(api.setRole(user.id, "user"), `${user.name} n'est plus administrateur.`);
        else setOpen("promote");
        return;
      case "ban":
        if (banned) void act(api.unban(user.id), `Suspension de ${user.name} levée.`);
        else setOpen("ban");
        return;
      case "impersonate":
        setOpen("impersonate");
        return;
      case "revoke":
        void act(api.revokeSessions(user.id), `Sessions de ${user.name} fermées.`);
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
          title={`Nommer ${user.name} administrateur`}
          confirmLabel="Nommer administrateur"
          onConfirm={() => act(api.setRole(user.id, "admin"), `${user.name} est administrateur.`)}
          onClose={close}
        >
          <Note>Il aura accès à ce back-office et à tous les comptes, le vôtre compris.</Note>
        </Dialog>
      )}
    </>
  );
}

type Act = ReturnType<typeof useAct>;

function BanDialog({ user, act, onClose }: { user: QuickUser; act: Act; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("");
  const duration = banDuration(days);
  return (
    <Dialog
      open
      title={`Suspendre ${user.name}`}
      confirmLabel="Suspendre"
      danger
      ready={duration.ok}
      onConfirm={() =>
        duration.ok ? act(api.ban(user.id, reason, duration.seconds), `${user.name} est suspendu.`) : false
      }
      onClose={onClose}
    >
      <Note>Ses sessions sont fermées tout de suite, et il ne peut plus en ouvrir jusqu'à la levée.</Note>
      <TextField label="motif (facultatif)" value={reason} onChange={(event) => setReason(event.target.value)} />
      <ChipGroup
        options={BAN_PRESETS.map((preset) => ({ value: preset.days, label: preset.label }))}
        value={BAN_PRESETS.some((preset) => preset.days === days) ? days : undefined}
        onChange={setDays}
      />
      <TextField
        label="durée en jours"
        placeholder="vide : définitive"
        value={days}
        onChange={(event) => setDays(event.target.value)}
        hint={duration.ok ? undefined : "Un nombre de jours, ou rien pour une suspension définitive."}
      />
    </Dialog>
  );
}

/**
 * La suppression demande de retaper le pseudo : un bouton « OK » se valide d'un réflexe,
 * et ce geste-ci ne se défait pas.
 */
function DeleteDialog({ user, onDeleted, onClose }: { user: QuickUser; onDeleted: () => void; onClose: () => void }) {
  const notify = useToast();
  const [check, setCheck] = useState("");
  return (
    <Dialog
      open
      title={`Supprimer ${user.name}`}
      confirmLabel="Supprimer définitivement"
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
      <Note>Le compte et ses sessions disparaissent. Le profil de jeu et l'historique des parties restent.</Note>
      <TextField label={`retapez « ${user.name} » pour confirmer`} value={check} onChange={(event) => setCheck(event.target.value)} />
    </Dialog>
  );
}

function ImpersonateDialog({ user, onClose }: { user: QuickUser; onClose: () => void }) {
  const notify = useToast();
  return (
    <Dialog
      open
      title={`Se connecter en tant que ${user.name}`}
      confirmLabel="Incarner ce joueur"
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
      <Note>
        Vous passez dans le jeu sous son identité, pour une heure au plus. Votre session d'administrateur est mise de
        côté : un bandeau permet d'y revenir à tout moment.
      </Note>
      <Note>Tout ce que vous ferez — file d'attente, coups, abandon — sera fait en son nom.</Note>
    </Dialog>
  );
}

/** La création d'un compte, depuis la liste. */
export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const notify = useToast();
  const go = useGo();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  return (
    <Dialog
      open
      title="Nouveau compte"
      confirmLabel="Créer"
      ready={name.trim().length >= 2 && email.includes("@") && password.length > 0}
      onConfirm={async () => {
        const result = await api.create(email, password, name, role);
        if (!result.ok) {
          notify(result.message, false);
          return false;
        }
        go({ view: "user", id: result.value.user.id }, `Compte ${result.value.user.name} créé.`);
        return true;
      }}
      onClose={onClose}
    >
      <TextField label="pseudo" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label="adresse" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField label="mot de passe" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <SelectField
        label="rôle"
        value={role}
        onChange={(event) => setRole(event.target.value)}
        options={[
          { value: "user", label: "joueur" },
          { value: "admin", label: "administrateur" },
        ]}
      />
      <Note>L'adresse n'est pas vérifiée à la création : marquez-la depuis la fiche si besoin.</Note>
    </Dialog>
  );
}
