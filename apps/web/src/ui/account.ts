import { type Identity, register, signIn, signOut, whoAmI } from "../net/auth.js";

/**
 * Le formulaire de compte. Provisoire, comme le reste de la console : aucun design
 * system n'est acté (docs/design.md 8.1).
 *
 * Le pseudo n'est demandé qu'à l'inscription — c'est le seul moment où il sert.
 */
export interface AccountElements {
  readonly form: HTMLFormElement;
  readonly email: HTMLInputElement;
  readonly password: HTMLInputElement;
  readonly handle: HTMLInputElement;
  readonly signIn: HTMLButtonElement;
  readonly register: HTMLButtonElement;
  readonly signOut: HTMLButtonElement;
  readonly status: HTMLElement;
}

export interface AccountOptions {
  readonly elements: AccountElements;
  /** Appelé à chaque changement d'identité : c'est lui qui ouvre ou ferme le jeu en ligne. */
  readonly onIdentity: (identity: Identity) => void;
}

export function attachAccount(options: AccountOptions): void {
  const { form, email, password, handle, signIn: signInButton, register: registerButton, signOut: signOutButton, status } = options.elements;

  const show = (identity: Identity, message?: string): void => {
    const connected = identity.signedIn;
    form.hidden = connected;
    signOutButton.hidden = !connected;
    status.textContent = message ?? (connected ? `Connecté : ${identity.handle ?? ""}` : "");
    options.onIdentity(identity);
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
    show(outcome.identity);
  };

  // Le formulaire porte deux actions : `submit` n'en désigne aucune, chaque bouton
  // dit laquelle. La soumission par la touche Entrée vaut connexion.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void attempt("signIn");
  });
  signInButton.addEventListener("click", () => void attempt("signIn"));
  registerButton.addEventListener("click", (event) => {
    event.preventDefault();
    void attempt("register");
  });
  signOutButton.addEventListener("click", () => {
    void signOut().then(() => show({ signedIn: false }));
  });

  void whoAmI().then((identity) => show(identity));
}
