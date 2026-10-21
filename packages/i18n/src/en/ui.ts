/** Les libellés par défaut des briques de la charte (`@occulis/ui`). */
export const ui = {
  close: "Close",
  cancel: "Cancel",
  edit: "Edit",
  showPassword: "Show password",
  hidePassword: "Hide password",
  search: "Search…",
  messagePlaceholder: "Write a message…",
  send: "Send",
  noMessages: "No messages.",
  empty: "Nothing to show.",
  loading: "Loading…",
  pager: {
    none: "no results",
    range: (from: number, to: number, total: number) => `${from}–${to} of ${total}`,
    previous: "← previous",
    next: "next →",
  },
  continueWithGoogle: "Continue with Google",
  versus: {
    seat: (seat: string) => `seat ${seat}`,
    against: "vs",
  },
  language: "Language",
  languages: { en: "English", fr: "Français" },
  settings: { label: "Settings", title: "Settings" },
  theme: {
    label: "Design",
    names: { obsidian: "Obsidian", reliquary: "Reliquary", astral: "Astral" },
    hints: {
      obsidian: "Black and bone, cold glows — the severe one",
      reliquary: "Warm black, old gold, fireflies and a turning seal",
      astral: "A dense sky: constellations, shooting stars, nebulae",
    },
  },
};
