import {
  type Identity,
  register,
  requestReset,
  resendVerification,
  resetPassword,
  resetTokenFrom,
  signIn,
  signOut,
  whoAmI,
} from "../net/auth.js";

/**
 * Le formulaire de compte. Provisoire, comme le reste de la console : aucun design
 * system n'est acté (docs/design.md 8.1).
 *
 * Quatre parcours y cohabitent, et un seul est visible à la fois : connexion,
 * inscription, demande de réinitialisation, et choix d'un nouveau mot de passe au
 * retour du lien reçu par courrier. Le pseudo n'est demandé qu'à l'inscription — c'est
 * le seul moment où il sert.
 *
 * L'état affiché n'est jamais déduit de ce qu'on vient d'envoyer : après chaque
 * action, l'identité est **redemandée au serveur**. Lui seul sait si l'adresse est
 * vérifiée, et c'est ce qui ouvre ou ferme le jeu en ligne.
 */
export interface AccountElements {
  readonly form: HTMLFormElement;
  readonly email: HTMLInputElement;
  readonly password: HTMLInputElement;
  readonly handle: HTMLInputElement;
  readonly signIn: HTMLButtonElement;
  readonly register: HTMLButtonElement;
  readonly forgot: HTMLButtonElement;
  readonly signOut: HTMLButtonElement;
  readonly resend: HTMLButtonElement;
  readonly resetForm: HTMLFormElement;
  readonly resetPassword: HTMLInputElement;
  readonly status: HTMLElement;
}

export interface AccountOptions {
  readonly elements: AccountElements;
  /** Appelé à chaque changement d'identité : c'est lui qui ouvre ou ferme le jeu en ligne. */
  readonly onIdentity: (identity: Identity) => void;
  /** L'URL courante, injectable pour que le parcours de réinitialisation soit testable. */
  readonly search?: string;
}

export function attachAccount(options: AccountOptions): void {
  const elements = options.elements;
  const { form, email, password, handle, status, resetForm } = elements;

  const resetToken = resetTokenFrom(options.search ?? window.location.search);

  const show = (identity: Identity, message?: string): void => {
    const connected = identity.signedIn;
    // Le formulaire de réinitialisation prend toute la place tant qu'un jeton est en
    // main : y proposer aussi de se connecter n'aurait pas de sens.
    const resetting = resetToken !== undefined;

    form.hidden = connected || resetting;
    resetForm.hidden = !resetting;
    elements.signOut.hidden = !connected;

    // Le rappel de vérification ne s'affiche qu'à quelqu'un de connecté dont l'adresse
    // ne l'est pas : c'est la seule situation où le bouton peut aboutir.
    elements.resend.hidden = !connected || identity.emailVerified !== false;

    status.textContent = message ?? statusFor(identity);
    options.onIdentity(identity);
  };

  const refresh = async (message?: string): Promise<void> => {
    show(await whoAmI(), message);
  };

  const attempt = async (action: "signIn" | "register"): Promise<void> => {
    status.textContent = "…";
    const outcome =
      action === "register"
        ? await register(email.value, password.value, handle.value)
        : await signIn(email.value, password.value);

    if (!outcome.ok) {
      status.textContent = outcome.message;
      return;
    }
    password.value = "";
    await refresh(
      action === "register"
        ? "Compte créé. Un message de vérification vous a été envoyé."
        : undefined,
    );
  };

  // Le formulaire porte trois actions : `submit` n'en désigne aucune, chaque bouton
  // dit laquelle. La soumission par la touche Entrée vaut connexion.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void attempt("signIn");
  });
  elements.signIn.addEventListener("click", () => void attempt("signIn"));
  elements.register.addEventListener("click", (event) => {
    event.preventDefault();
    void attempt("register");
  });

  elements.forgot.addEventListener("click", (event) => {
    event.preventDefault();
    if (email.value.trim().length === 0) {
      status.textContent = "Renseignez votre adresse, puis redemandez.";
      return;
    }
    status.textContent = "…";
    void requestReset(email.value).then((outcome) => {
      // Le même message dans les deux cas, y compris pour une adresse inconnue :
      // confirmer l'envoi dirait qui est inscrit.
      status.textContent = outcome.ok
        ? "Si cette adresse a un compte, un message vient de partir."
        : outcome.message;
    });
  });

  elements.signOut.addEventListener("click", () => {
    void signOut().then(() => show({ signedIn: false }));
  });

  elements.resend.addEventListener("click", () => {
    status.textContent = "…";
    void resendVerification(email.value).then((outcome) => {
      status.textContent = outcome.ok ? "Message renvoyé." : outcome.message;
    });
  });

  resetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (resetToken === undefined) return;

    status.textContent = "…";
    void resetPassword(resetToken, elements.resetPassword.value).then(async (outcome) => {
      if (!outcome.ok) {
        status.textContent = outcome.message;
        return;
      }
      elements.resetPassword.value = "";
      // Le jeton est brûlé : laisser le formulaire à l'écran inviterait à réessayer
      // avec un lien qui ne vaut plus rien.
      resetForm.hidden = true;
      form.hidden = false;
      await refresh("Mot de passe changé. Vous pouvez vous connecter.");
    });
  });

  void refresh();
}

function statusFor(identity: Identity): string {
  if (!identity.signedIn) return "";
  if (identity.emailVerified === false) {
    // Dit pourquoi le jeu en ligne reste fermé : sans ça, le bouton désactivé n'a
    // aucune explication à l'écran.
    return `Connecté : ${identity.handle ?? ""} · adresse non vérifiée, jeu en ligne fermé`;
  }
  return `Connecté : ${identity.handle ?? ""}`;
}
