import type { Messages } from "../messages.js";

export const prepare: Messages["prepare"] = {
  found: {
    title: "Partie trouvée",
    lead: "Acceptez pour lancer la partie.",
    accept: "Accepter",
    decline: "Refuser",
    accepted: "Acceptée",
    waitingOpponent: "En attente de votre adversaire…",
    opponentAccepted: "Votre adversaire a accepté.",
    remaining: (seconds) => `${seconds} s`,
    tabTitle: "Partie trouvée !",
  },
  lapsed: {
    requeued: "Votre adversaire n'a pas accepté : retour dans la file.",
    dropped: "La partie n'a pas été acceptée : vous avez quitté la file.",
  },
  reveal: {
    versus: "contre",
    you: "Vous",
    elo: (elo) => `${elo} Elo`,
    record: (played, won) => `${played} jouées · ${won} gagnées`,
    newcomer: "première partie",
    rated: "Classée",
    unrated: "Non classée",
  },
  deploy: {
    title: "Déploiement",
    lead: "Choisissez vos pièces et posez-les dans votre zone. Votre adversaire ne voit pas votre placement.",
    lock: "Verrouiller",
    locked: "Verrouillée",
    waitingOpponent: "En attente de votre adversaire…",
    opponentLocked: "Votre adversaire est prêt.",
    opponentPending: "Votre adversaire se déploie encore.",
    remaining: (seconds) => `${seconds} s restantes`,
    timeoutNote: "À l'échéance, votre placement est retenu s'il est complet, sinon celui par défaut.",
    preset: "Équipe",
    noPreset: "Placement en cours",
    loadPreset: "Charger",
  },
  remaining: "Temps restant",
};
