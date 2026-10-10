/** Les libellés par défaut des briques de la charte (`@occulis/ui`). */
export const ui = {
  close: "Close",
  cancel: "Cancel",
  edit: "Edit",
  showPassword: "Show password",
  hidePassword: "Hide password",
  search: "Search…",
  empty: "Nothing to show.",
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
};
