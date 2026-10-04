import { cx } from "../cx.js";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Souligne l'option à la couleur d'un camp quand elle est choisie (un point de vue de joueur). */
  camp?: "A" | "B" | undefined;
  /** Fait de l'option un lien (un filtre porté par l'URL) plutôt qu'un bouton. */
  href?: string | undefined;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange?: ((value: T) => void) | undefined;
  label?: string | undefined;
}

/** Un choix exclusif entre quelques options : filtres de liste, point de vue. */
export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  return (
    <nav className="occ-segmented" aria-label={label}>
      {options.map((option) => {
        const className = cx("occ-segmented__option", option.camp !== undefined && `occ-segmented__option--${option.camp}`);
        const current = option.value === value ? "true" : undefined;
        return option.href !== undefined ? (
          <a key={option.value} className={className} href={option.href} aria-current={current}>
            {option.label}
          </a>
        ) : (
          <button key={option.value} type="button" className={className} aria-current={current} onClick={() => onChange?.(option.value)}>
            {option.label}
          </button>
        );
      })}
    </nav>
  );
}

export interface ChipGroupProps {
  options: readonly { value: string; label: string }[];
  /** L'option choisie ; aucune quand la valeur ne correspond à aucune. */
  value: string | undefined;
  onChange: (value: string) => void;
}

/** Des valeurs proposées d'un clic au-dessus d'un champ libre : des durées, des montants. */
export function ChipGroup({ options, value, onChange }: ChipGroupProps) {
  return (
    <div className="occ-chips">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          className={cx("occ-chip", option.value === value && "occ-chip--selected")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
