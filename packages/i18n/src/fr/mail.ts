import type { Messages } from "../messages.js";

export const mail: Messages["mail"] = {
  copyLink: "Ou copiez ce lien dans votre navigateur :",
  automatic: "Message automatique envoyé par Occulis — inutile d'y répondre.",
  verification: {
    subject: "Confirmez votre adresse — Occulis",
    preheader: "Un clic pour ouvrir le jeu en ligne.",
    title: "Bienvenue sur Occulis",
    paragraphs: [
      "Votre compte est créé. Il reste à confirmer cette adresse : c'est elle qui ouvre la file d'attente et les parties en ligne.",
    ],
    action: "Confirmer mon adresse",
    footnote: "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message : aucun compte ne sera activé.",
  },
  reset: {
    subject: "Réinitialisation de votre mot de passe — Occulis",
    preheader: "Ce lien expire dans une heure.",
    title: "Nouveau mot de passe",
    paragraphs: [
      "Une réinitialisation a été demandée pour ce compte. Choisissez un nouveau mot de passe depuis le lien ci-dessous ; il expire dans une heure.",
      "Toutes vos sessions ouvertes seront fermées une fois le mot de passe changé.",
    ],
    action: "Choisir un mot de passe",
    footnote: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.",
  },
  changeEmail: {
    subject: "Changement d'adresse demandé — Occulis",
    preheader: (email) => `Remplacer cette adresse par ${email} ?`,
    title: "Changer d'adresse",
    paragraphs: (email) => [
      `Une demande a été faite pour remplacer l'adresse de votre compte par ${email}.`,
      "Si vous confirmez, un second message partira vers la nouvelle adresse pour la vérifier. Rien ne change tant que les deux n'ont pas été confirmées.",
    ],
    action: "Confirmer le changement",
    footnote:
      "Si vous n'avez rien demandé, ignorez ce message et changez votre mot de passe : quelqu'un a pu accéder à votre session.",
  },
  deleteAccount: {
    subject: "Suppression de votre compte — Occulis",
    preheader: "Confirmez pour supprimer définitivement votre compte.",
    title: "Supprimer le compte",
    paragraphs: [
      "Vous avez demandé la suppression de votre compte. Une fois confirmée, elle est définitive : votre adresse, vos sessions et vos connexions sont effacées, et votre pseudo est remplacé dans l'historique des parties.",
      "Le lien n'agit que dans le navigateur où vous êtes connecté, et expire dans 24 heures.",
    ],
    action: "Supprimer définitivement",
    footnote: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et changez votre mot de passe.",
  },
  passwordChanged: {
    subject: "Votre mot de passe a changé — Occulis",
    preheader: "Un avis de sécurité, rien à faire si c'était vous.",
    title: "Mot de passe changé",
    paragraphs: [
      "Le mot de passe de votre compte vient d'être changé, et les autres sessions ont été fermées.",
      "Si c'était vous, il n'y a rien à faire.",
    ],
    action: "Voir mes sessions",
    footnote:
      "Si ce n'était pas vous, demandez immédiatement une réinitialisation depuis l'écran de connexion : elle fermera toutes les sessions.",
  },
  providerLinked: {
    subject: (provider) => `Connexion ${provider} ajoutée — Occulis`,
    preheader: "Un avis de sécurité, rien à faire si c'était vous.",
    title: (provider) => `${provider} est lié à votre compte`,
    paragraphs: (provider) => [`Vous pouvez désormais vous connecter à Occulis avec ${provider}.`, "Si c'était vous, il n'y a rien à faire."],
    action: "Gérer mes connexions",
    footnote: "Si ce n'était pas vous, retirez cette connexion depuis votre profil et changez votre mot de passe.",
  },
};
