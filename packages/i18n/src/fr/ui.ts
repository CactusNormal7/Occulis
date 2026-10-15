import type { Messages } from "../messages.js";

export const ui: Messages["ui"] = {
  close: "Fermer",
  cancel: "Annuler",
  edit: "Modifier",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  search: "Rechercher…",
  messagePlaceholder: "Écrire un message…",
  send: "Envoyer",
  noMessages: "Aucun message.",
  empty: "Rien à afficher.",
  loading: "Chargement…",
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
  theme: {
    label: "Design",
    names: { obsidian: "Obsidienne", reliquary: "Reliquaire", astral: "Astral" },
    hints: {
      obsidian: "Noir et os, lueurs froides — le plus sévère",
      reliquary: "Noir chaud, or ancien, lucioles et sceau qui tourne",
      astral: "Un ciel dense : constellations, étoiles filantes, nébuleuses",
    },
  },
};
