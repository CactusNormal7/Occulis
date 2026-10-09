import type { Messages } from "../messages.js";

export const game: Messages["game"] = {
  title: "Occulis",
  impersonation: {
    text: "Session d'emprunt : vous incarnez",
    stop: "Revenir à mon compte",
  },
  myProfile: "Mon profil",
  menu: {
    resend: "Renvoyer le message de vérification",
    quick: "Partie rapide",
    quickHint: "Le premier adversaire disponible",
    host: "Créer une partie",
    hostHint: "Un code à transmettre à votre adversaire",
    join: "Rejoindre une partie",
    joinButton: "Rejoindre",
    codePlaceholder: "CODE",
    admin: "Back-office",
    signOut: "Se déconnecter",
    sending: "Envoi…",
    resent: (email) => `Message renvoyé à ${email}.`,
    yourAddress: "votre adresse",
    unverified: (handle) => `${handle} · adresse non vérifiée, le jeu reste fermé`,
  },
  waiting: {
    copy: "Copier",
    copied: "Copié",
    cancel: "Annuler",
    quick: "Recherche d'un adversaire…",
    join: "Entrée dans la partie…",
    opening: "Ouverture de la partie…",
    hosting: "Transmettez ce code à votre adversaire, puis attendez son arrivée.",
  },
  roomFault: {
    unknown: "Aucune partie sous ce code : vérifiez la saisie, ou faites-le renvoyer.",
    own: "C'est votre propre code : transmettez-le à votre adversaire.",
  },
  outdated: (expected) => `Client trop ancien : le serveur attend le protocole ${expected}.`,
  reconnecting: "Connexion perdue, reprise en cours…",
  console: {
    label: "Partie en cours",
    move: "Coup",
    help: {
      move: "déplace",
      resign: "abandon",
    },
    leave: "Quitter la partie",
    pending: "Coup déjà envoyé : réponse du serveur en attente.",
    resigned: "Abandon.",
    sent: (summary) => `${summary} — envoyé.`,
  },
  fault: {
    empty: "Saisie vide.",
    badCoord: (token) => `Coordonnée illisible : « ${token} ». Format attendu : x,y`,
    missingDestination: "Destination manquante. Exemple : 1,6 2,5",
    trailing: (token) => `Fin de commande inattendue : « ${token} »`,
    noPieceHere: (coord) => `Aucune pièce en ${coord}.`,
  },
  actionError: {
    gameOver: "La partie est terminée.",
    unknownPiece: "Pièce inconnue.",
    notYourPiece: "Cette pièce n'est pas au trait.",
    unreachable: (coord) => `${coord} est hors de portée de cette pièce ce tour-ci.`,
  },
  rejection: {
    unknownSeat: "Siège inconnu : cette connexion n'appartient à aucun des deux camps.",
    notYourTurn: (active) => `Ce n'est pas votre tour : ${active} est au trait.`,
  },
  outcome: {
    victory: (winner, reason) => `Victoire de ${winner} (${reason}).`,
    reasons: { resignation: "abandon" },
  },
  turn: {
    line: (turn, whose, seat) => `Tour ${turn} · ${whose} · vous jouez ${seat}`,
    yours: "à vous de jouer",
    theirs: "au trait : l'adversaire",
  },
  tile: {
    offBoard: "Hors plateau.",
    relief: (x, y, height) => `${x},${y} · hauteur ${height}`,
    impassable: "infranchissable",
  },
};
