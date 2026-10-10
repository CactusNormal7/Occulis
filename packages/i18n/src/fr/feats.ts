import type { Messages } from "../messages.js";

export const feats: Messages["feats"] = {
  names: {
    "first-match": "Premiers pas",
    "first-win": "Premier sang",
    "matches-10": "Habitué",
    "matches-50": "Vétéran",
    "wins-10": "Tacticien",
    "streak-3": "En série",
    "streak-5": "Inarrêtable",
    "rating-1400": "Étoile montante",
  },
  descriptions: {
    "first-match": "Terminer une partie.",
    "first-win": "Gagner une partie.",
    "matches-10": "Terminer 10 parties.",
    "matches-50": "Terminer 50 parties.",
    "wins-10": "Gagner 10 parties.",
    "streak-3": "Gagner 3 parties d'affilée.",
    "streak-5": "Gagner 5 parties d'affilée.",
    "rating-1400": "Atteindre 1400 d'Elo.",
  },
  title: "Faits d'armes",
  lead: "Ils se débloquent en jouant. Exhibez-en jusqu'à trois devant vos adversaires.",
  locked: "verrouillé",
  shown: "exhibé",
  show: "Exhiber",
  hide: "Retirer",
  full: "Trois faits sont déjà exhibés.",
  saved: "Vitrine mise à jour.",
  none: "Aucun fait exhibé.",
};
