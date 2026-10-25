import { useState } from "react";
import type { MeProfile } from "@occulis/protocol";
import { Note, PasswordField, SettingEditor, TextField, useMessages } from "@occulis/ui";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, passwordHint } from "../account/model.js";
import * as api from "./api.js";

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

export function HandleEditor({ current, onDone, onCancel }: EditorProps & { current: string }) {
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

export function EmailEditor({ profile, onDone, onCancel }: EditorProps & { profile: MeProfile }) {
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
          profile.emailVerified
            ? m.emailEditor.doneVerified(profile.email)
            : m.emailEditor.doneUnverified(address),
        )
      }
      note={
        profile.emailVerified
          ? m.emailEditor.noteVerified(profile.email)
          : m.emailEditor.noteUnverified
      }
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
export function PasswordEditor({ email, onDone, onCancel }: EditorProps & { email: string }) {
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
        {...{
          passwordrules: `minlength: ${MIN_PASSWORD_LENGTH}; maxlength: ${MAX_PASSWORD_LENGTH};`,
        }}
        value={next}
        onChange={(event) => setNext(event.target.value)}
        hint={passwordHint(next)}
      />
    </SettingEditor>
  );
}

/** Un compte Google sans mot de passe en obtient un par le lien envoyé à son adresse. */
export function PasswordSetupEditor({ email, onDone, onCancel }: EditorProps & { email: string }) {
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
