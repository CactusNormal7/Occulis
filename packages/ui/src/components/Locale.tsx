import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALES, type Locale, type Messages, messagesFor } from "@occulis/i18n";
import { Segmented } from "./Segmented.js";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Fixe la langue de tout ce qu'il enveloppe ; `UiRoot` le pose quand il reçoit `locale`. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Le dictionnaire de la langue courante — tout texte affiché passe par lui. */
export function useMessages(): Messages {
  return messagesFor(useContext(LocaleContext));
}

export interface LocaleSwitchProps {
  value: Locale;
  onChange: (locale: Locale) => void;
}

/** Le choix de langue : chaque langue écrite dans sa propre langue. */
export function LocaleSwitch({ value, onChange }: LocaleSwitchProps) {
  const m = useMessages();
  return (
    <Segmented
      label={m.ui.language}
      value={value}
      onChange={onChange}
      options={LOCALES.map((locale) => ({ value: locale, label: locale.toUpperCase() }))}
    />
  );
}
