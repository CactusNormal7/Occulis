import type { Messages } from "../messages.js";

export const ui: Messages["ui"] = {
  close: "Fermer",
  cancel: "Annuler",
  edit: "Modifier",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  search: "Rechercher…",
  empty: "Rien à afficher.",
  pager: {
    none: "aucun résultat",
    range: (from, to, total) => `${from}–${to} sur ${total}`,
    previous: "← précédents",
    next: "suivants →",
  },
  continueWithGoogle: "Continuer avec Google",
  versus: {
    seat: (seat) => `siège ${seat}`,
    against: "contre",
  },
  language: "Langue",
  languages: { en: "English", fr: "Français" },
};
