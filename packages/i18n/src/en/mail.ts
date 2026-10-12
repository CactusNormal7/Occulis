/** Les courriers transactionnels, écrits dans la langue de la requête qui les déclenche. */
export const mail = {
  copyLink: "Or copy this link into your browser:",
  automatic: "Automatic message sent by Occulis — no need to reply.",
  verification: {
    subject: "Confirm your address — Occulis",
    preheader: "One click to open online play.",
    title: "Welcome to Occulis",
    paragraphs: ["Your account is created. All that remains is to confirm this address: it opens the queue and online matches."],
    action: "Confirm my address",
    footnote: "If you did not sign up, ignore this message: no account will be activated.",
  },
  reset: {
    subject: "Reset your password — Occulis",
    preheader: "This link expires in one hour.",
    title: "New password",
    paragraphs: [
      "A reset was requested for this account. Choose a new password from the link below; it expires in one hour.",
      "Every open session will be closed once the password is changed.",
    ],
    action: "Choose a password",
    footnote: "If you did not request this, ignore this message: your password stays unchanged.",
  },
  changeEmail: {
    subject: "Address change requested — Occulis",
    preheader: (email: string) => `Replace this address with ${email}?`,
    title: "Change address",
    paragraphs: (email: string) => [
      `A request was made to replace your account's address with ${email}.`,
      "If you confirm, a second message will go to the new address to verify it. Nothing changes until both have been confirmed.",
    ],
    action: "Confirm the change",
    footnote: "If you did not request anything, ignore this message and change your password: someone may have accessed your session.",
  },
  deleteAccount: {
    subject: "Deleting your account — Occulis",
    preheader: "Confirm to permanently delete your account.",
    title: "Delete the account",
    paragraphs: [
      "You asked for your account to be deleted. Once confirmed, it is permanent: your address, sessions and sign-ins are erased, and your handle is replaced in the match history.",
      "The link only works in the browser where you are signed in, and expires in 24 hours.",
    ],
    action: "Delete permanently",
    footnote: "If you did not request this, ignore this message and change your password.",
  },
  passwordChanged: {
    subject: "Your password has changed — Occulis",
    preheader: "A security notice, nothing to do if it was you.",
    title: "Password changed",
    paragraphs: ["Your account's password has just been changed, and the other sessions have been closed.", "If it was you, there is nothing to do."],
    action: "See my sessions",
    footnote: "If it was not you, request a reset right away from the sign-in screen: it will close every session.",
  },
  providerLinked: {
    subject: (provider: string) => `${provider} sign-in added — Occulis`,
    preheader: "A security notice, nothing to do if it was you.",
    title: (provider: string) => `${provider} is linked to your account`,
    paragraphs: (provider: string) => [`You can now sign in to Occulis with ${provider}.`, "If it was you, there is nothing to do."],
    action: "Manage my sign-ins",
    footnote: "If it was not you, remove this sign-in from your profile and change your password.",
  },
};
