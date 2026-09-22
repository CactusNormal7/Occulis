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
 * L'écran de compte : un vrai formulaire plein écran, et non une barre de page.
 *
 * Quatre parcours y cohabitent, et un seul est visible à la fois : connexion,
 * inscription, demande de réinitialisation, et choix d'un nouveau mot de passe au
 * retour du lien reçu par courrier. Trois sont choisis par le joueur (`Mode`), le
 * quatrième s'impose quand l'URL porte un jeton. Le pseudo n'est demandé qu'à
 * l'inscription — c'est le seul moment où il sert.
 *
 * L'état affiché n'est jamais déduit de ce qu'on vient d'envoyer : après chaque
 * action, l'identité est **redemandée au serveur**. Lui seul sait si l'adresse est
 * vérifiée, et c'est ce qui ouvre ou ferme le jeu en ligne.
 */
export type Mode = "signin" | "register" | "forgot";

export interface AccountElements {
  readonly form: HTMLFormElement;
  readonly email: HTMLInputElement;
  readonly password: HTMLInputElement;
  readonly handle: HTMLInputElement;
  /** Enveloppes des champs, masquées avec leur étiquette selon le parcours. */
  readonly passwordField: HTMLElement;
  readonly handleField: HTMLElement;
  readonly submit: HTMLButtonElement;
  /** Les trois onglets, portant `data-mode`. */
  readonly tabs: readonly HTMLButtonElement[];
  readonly status: HTMLElement;
  readonly signOut: HTMLButtonElement;
  readonly resend: HTMLButtonElement;
  readonly resetForm: HTMLFormElement;
  readonly resetPassword: HTMLInputElement;
}

export interface AccountOptions {
  readonly elements: AccountElements;
  /** Appelé à chaque changement d'identité : c'est lui qui ouvre ou ferme le jeu en ligne. */
  readonly onIdentity: (identity: Identity) => void;
  /** L'URL courante, injectable pour que le parcours de réinitialisation soit testable. */
  readonly search?: string;
}

export interface Account {
  /** Redemande l'identité au serveur — après une déconnexion venue d'ailleurs. */
  refresh(): Promise<void>;
}

const LABELS: Record<Mode, string> = {
  signin: "Se connecter",
  register: "Créer le compte",
  forgot: "Envoyer le lien",
};

export function attachAccount(options: AccountOptions): Account {
  const elements = options.elements;
  const { form, email, password, handle, status, resetForm } = elements;

  const resetToken = resetTokenFrom(options.search ?? window.location.search);
  let mode: Mode = "signin";

  const showMode = (next: Mode): void => {
    mode = next;
    for (const tab of elements.tabs) {
      tab.setAttribute("aria-selected", String(tab.dataset["mode"] === mode));
    }
    // Un mot de passe n'a rien à faire dans une demande de réinitialisation, et un
    // pseudo n'a de sens qu'à l'inscription : les champs inutiles disparaissent
    // plutôt que d'être ignorés en silence.
    elements.passwordField.hidden = mode === "forgot";
    elements.handleField.hidden = mode !== "register";
    password.autocomplete = mode === "register" ? "new-password" : "current-password";
    elements.submit.textContent = LABELS[mode];
    status.textContent = "";
  };

  const show = (identity: Identity, message?: string): void => {
    // Le formulaire de réinitialisation prend toute la place tant qu'un jeton est en
    // main : y proposer aussi de se connecter n'aurait pas de sens.
    const resetting = resetToken !== undefined;

    form.hidden = identity.signedIn || resetting;
    resetForm.hidden = !resetting;
    elements.signOut.hidden = !identity.signedIn;

    // Le rappel de vérification ne s'affiche qu'à quelqu'un de connecté dont l'adresse
    // ne l'est pas : c'est la seule situation où le bouton peut aboutir.
    elements.resend.hidden = !identity.signedIn || identity.emailVerified !== false;

    if (message !== undefined) status.textContent = message;
    options.onIdentity(identity);
  };

  const refresh = async (message?: string): Promise<void> => {
    show(await whoAmI(), message);
  };

  const attempt = async (): Promise<void> => {
    if (mode === "forgot") return askReset();

    status.textContent = "…";
    const outcome =
      mode === "register"
        ? await register(email.value, password.value, handle.value)
        : await signIn(email.value, password.value);

    if (!outcome.ok) {
      status.textContent = outcome.message;
      return;
    }
    password.value = "";
    await refresh(
      mode === "register" ? "Compte créé. Un message de vérification vous a été envoyé." : "",
    );
  };

  const askReset = async (): Promise<void> => {
    if (email.value.trim().length === 0) {
      status.textContent = "Renseignez votre adresse, puis redemandez.";
      return;
    }
    status.textContent = "…";
    const outcome = await requestReset(email.value);
    // Le même message dans les deux cas, y compris pour une adresse inconnue :
    // confirmer l'envoi dirait qui est inscrit.
    status.textContent = outcome.ok
      ? "Si cette adresse a un compte, un message vient de partir."
      : outcome.message;
  };

  for (const tab of elements.tabs) {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const wanted = tab.dataset["mode"];
      if (wanted === "signin" || wanted === "register" || wanted === "forgot") showMode(wanted);
    });
  }

  // Un seul bouton d'envoi, dont l'action dépend de l'onglet : la touche Entrée
  // fait donc exactement ce que le formulaire affiche.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void attempt();
  });

  elements.signOut.addEventListener("click", () => {
    void signOut().then(() => {
      showMode("signin");
      show({ signedIn: false });
    });
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

  showMode("signin");
  void refresh();
  return { refresh: () => refresh() };
}

/** Ce que le menu affiche du compte : le pseudo, et l'état de la vérification. */
export function describeIdentity(identity: Identity): string {
  if (!identity.signedIn) return "";
  if (identity.emailVerified === false) {
    // Dit pourquoi le jeu reste fermé : sans ça, les boutons désactivés n'ont
    // aucune explication à l'écran.
    return `${identity.handle ?? ""} · adresse non vérifiée, le jeu reste fermé`;
  }
  return identity.handle ?? "";
}
