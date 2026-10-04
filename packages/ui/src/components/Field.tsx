import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cx } from "../cx.js";
import { Icon } from "./Icon.js";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Le libellé, au-dessus du champ, en minuscules estompées. */
  label: string;
  /** Une précision sous le champ. */
  hint?: ReactNode | undefined;
}

/** Un champ de saisie libellé. */
export function TextField({ label, hint, className, ...rest }: TextFieldProps) {
  return (
    <label className={cx("occ-field", className)}>
      <span className="occ-field__label">{label}</span>
      <input className="occ-input" {...rest} />
      {hint !== undefined && <small className="occ-field__hint">{hint}</small>}
    </label>
  );
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
