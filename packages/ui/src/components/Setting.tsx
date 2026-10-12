import { useEffect, useRef, type FormEvent, type FormHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../cx.js";
import { Button } from "./Button.js";
import { FormMessage } from "./Form.js";
import { useMessages } from "./Locale.js";

/** Le conteneur des `SettingRow` : une liste de réglages, séparés d'un trait fin. */
export function SettingList({ children }: { children: ReactNode }) {
  return <div className="occ-settings">{children}</div>;
}

export interface SettingRowProps {
  /** Le nom du réglage : « Pseudo », « Mot de passe ». */
  label: string;
  /** Sa valeur actuelle, en lecture. */
  value: ReactNode;
  /** Une précision sous la valeur : une règle, un délai, la raison d'un bouton grisé. */
  description?: ReactNode | undefined;
  /** Le libellé du bouton d'édition : un verbe (« Modifier », « Changer », « Définir »). */
  editLabel?: string | undefined;
  /** Sans lui, pas de bouton d'édition (réglage en lecture seule, ou `action` à la place). */
  onEdit?: (() => void) | undefined;
  editDisabled?: boolean | undefined;
  /** Un geste propre au réglage (« Lier », « Retirer »), à la place du bouton d'édition. */
  action?: ReactNode | undefined;
  /** L'éditeur est ouvert : `children` remplace la valeur, le bouton disparaît. */
  editing?: boolean | undefined;
  /** L'éditeur, en général un `SettingEditor`. */
  children?: ReactNode | undefined;
}

/**
 * Un réglage **en lecture d'abord** : libellé, valeur, et un bouton pour le modifier. Le
 * bouton déplie l'éditeur dans la ligne même, sans quitter la page ni masquer le reste —
 * on voit ce qu'on change et à côté de quoi. Quand l'éditeur se referme, le focus revient
 * au bouton qui l'avait ouvert, pour que le clavier reprenne où il en était.
 */
export function SettingRow({
  label,
  value,
  description,
  editLabel,
  onEdit,
  editDisabled = false,
  action,
  editing = false,
  children,
}: SettingRowProps) {
  const m = useMessages();
  const trigger = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(editing);
  useEffect(() => {
    if (wasEditing.current && !editing) trigger.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  return (
    <section className={cx("occ-setting", editing && "occ-setting--editing")} aria-label={label}>
      <div className="occ-setting__main">
        <h4 className="occ-setting__label">{label}</h4>
        {editing ? (
          children
        ) : (
          <>
            <div className="occ-setting__value">{value}</div>
            {description !== undefined && <p className="occ-setting__description">{description}</p>}
          </>
        )}
      </div>
      {!editing && (action ?? (onEdit !== undefined && (
        <Button ref={trigger} size="sm" onClick={onEdit} disabled={editDisabled}>
          {editLabel ?? m.ui.edit}
        </Button>
      )))}
    </section>
  );
}

export interface SettingEditorProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  /** Le geste du bouton d'envoi : « Enregistrer », « Envoyer le lien ». */
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  busy?: boolean | undefined;
  /** Le refus du serveur, affiché dans l'éditeur, au-dessus des boutons. */
  error?: string | undefined;
  /** Une précision au pied de l'éditeur : ce qui se passera après l'envoi. */
  note?: ReactNode | undefined;
  danger?: boolean | undefined;
  children: ReactNode;
}

/**
 * L'éditeur d'un réglage : un vrai `<form>` — Entrée envoie, et les gestionnaires de mots
 * de passe le reconnaissent —, Échap annule. Le premier champ prend le focus à l'ouverture.
 */
export function SettingEditor({
  submitLabel,
  onSubmit,
  onCancel,
  busy = false,
  error,
  note,
  danger = false,
  children,
  className,
  ...rest
}: SettingEditorProps) {
  const m = useMessages();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>("input:not([type=hidden]):not([hidden])")?.focus();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy) onSubmit();
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onCancel();
  };

  return (
    <form ref={form} className={cx("occ-setting-editor", className)} onSubmit={submit} onKeyDown={escape} {...rest}>
      {children}
      {note !== undefined && <p className="occ-setting__description">{note}</p>}
      {error !== undefined && <FormMessage tone="error">{error}</FormMessage>}
      <div className="occ-setting-editor__actions">
        <Button type="submit" size="sm" variant={danger ? "danger" : "primary"} disabled={busy}>
          {busy ? "…" : submitLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {m.ui.cancel}
        </Button>
      </div>
    </form>
  );
}
