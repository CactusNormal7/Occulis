import { useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cx } from "../cx.js";
import { Icon } from "./Icon.js";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Le libellé, au-dessus du champ, en minuscules estompées. */
  label: string;
  /** Une précision sous le champ. */
  hint?: ReactNode | undefined;
  /** Le refus propre à ce champ, sous lui, dans la teinte des refus. */
  error?: string | undefined;
}

/**
 * Un champ de saisie libellé. Le libellé **enveloppe** le champ : c'est ce qui l'y
 * associe pour les lecteurs d'écran comme pour les gestionnaires de mots de passe, sans
 * identifiant à tenir. L'aide et l'erreur lui sont rattachées par `aria-describedby`.
 */
export function TextField({ label, hint, error, className, ...rest }: TextFieldProps) {
  const described = useDescription(hint, error);
  return (
    <label className={cx("occ-field", error !== undefined && "occ-field--error", className)}>
      <span className="occ-field__label">{label}</span>
      <input className="occ-input" aria-invalid={error !== undefined || undefined} aria-describedby={described.ids} {...rest} />
      {described.nodes}
    </label>
  );
}

export interface PasswordFieldProps extends Omit<TextFieldProps, "type"> {
  /** `current-password` pour se connecter, `new-password` pour en choisir un. */
  autoComplete: "current-password" | "new-password";
}

/**
 * Un champ de mot de passe, avec un bouton pour l'afficher. Le champ reste de type
 * `password` tant qu'on ne le demande pas — c'est à ce type que les gestionnaires de mots
 * de passe le reconnaissent — et le bouton n'est jamais un `submit`.
 */
export function PasswordField({ label, hint, error, className, ...rest }: PasswordFieldProps) {
  const [shown, setShown] = useState(false);
  const described = useDescription(hint, error);
  return (
    <label className={cx("occ-field", error !== undefined && "occ-field--error", className)}>
      <span className="occ-field__label">{label}</span>
      <span className="occ-password">
        <input
          className="occ-input"
          type={shown ? "text" : "password"}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={error !== undefined || undefined}
          aria-describedby={described.ids}
          {...rest}
        />
        <button
          type="button"
          className="occ-password__toggle"
          aria-pressed={shown}
          aria-label={shown ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          onClick={() => setShown((value) => !value)}
        >
          <Icon name={shown ? "eyeOff" : "eye"} />
        </button>
      </span>
      {described.nodes}
    </label>
  );
}

function useDescription(hint: ReactNode | undefined, error: string | undefined): { ids: string | undefined; nodes: ReactNode } {
  const id = useId();
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const ids = [errorId, hintId].filter((value) => value !== undefined).join(" ");
  return {
    ids: ids.length === 0 ? undefined : ids,
    nodes: (
      <>
        {error !== undefined && (
          <small id={errorId} className="occ-field__error">
            {error}
          </small>
        )}
        {hint !== undefined && (
          <small id={hintId} className="occ-field__hint">
            {hint}
          </small>
        )}
      </>
    ),
  };
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly { value: string; label: string }[];
}

/** Une liste déroulante libellée. */
export function SelectField({ label, options, className, ...rest }: SelectFieldProps) {
  return (
    <label className={cx("occ-field", className)}>
      <span className="occ-field__label">{label}</span>
      <select className="occ-input" {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface SearchFieldProps {
  defaultValue?: string | undefined;
  placeholder?: string | undefined;
  /** Appelé à la validation (Entrée), pas à chaque frappe. */
  onSearch: (value: string) => void;
}

/** Un champ de recherche, loupe à gauche, validé par Entrée. */
export function SearchField({ defaultValue = "", placeholder = "Rechercher…", onSearch }: SearchFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(value);
  };
  return (
    <form className="occ-search" onSubmit={submit} role="search">
      <Icon name="search" />
      <input
        className="occ-input"
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </form>
  );
}

export interface InlineEditProps {
  label: string;
  type?: "text" | "email" | "password" | undefined;
  defaultValue?: string | undefined;
  /** Le libellé du bouton : un verbe (« Renommer », « Définir »). */
  action: string;
  /** Rend une promesse : le bouton reste inactif jusqu'à la réponse. */
  onSubmit: (value: string) => Promise<unknown> | void;
}

/** Un champ et son bouton sur une ligne : l'édition d'une seule valeur, sur place. */
export function InlineEdit({ label, type = "text", defaultValue = "", action, onSubmit }: InlineEditProps) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    void Promise.resolve(onSubmit(value)).finally(() => setBusy(false));
  };
  return (
    <form className="occ-inline-edit" onSubmit={submit}>
      <span className="occ-field__label">{label}</span>
      <input
        className="occ-input"
        type={type}
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="occ-button occ-button--default occ-button--md" disabled={busy}>
        {action}
      </button>
    </form>
  );
}
