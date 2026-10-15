import { useState } from "react";
import { LocaleSwitch } from "@occulis/ui";

export const English = () => {
  const [locale, setLocale] = useState<"en" | "fr">("en");
  return <LocaleSwitch value={locale} onChange={setLocale} />;
};

export const French = () => {
  const [locale, setLocale] = useState<"en" | "fr">("fr");
  return <LocaleSwitch value={locale} onChange={setLocale} />;
};
