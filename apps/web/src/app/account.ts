import { arrivalNotice, cleanedSearch, routeOf } from "../account/model.js";
import { mountAccount } from "../account/mount.js";
import { currentLocale, messages } from "../locale/current.js";
import * as auth from "../net/auth.js";
import type { FlowEvent, Stage } from "../ui/flow.js";
import type { Shell } from "../ui/shell.js";
import type { Friends } from "./friends.js";
import { element } from "./page.js";

export interface AccountEffects {
  readonly stage: () => Stage;
  readonly go: (event: FlowEvent) => void;
  readonly shell: Pick<Shell, "setIdentity" | "notify">;
  readonly friends: Pick<Friends, "beforeMenu" | "sync">;
  /** Referme tout ce qui relie le client au serveur et revient au menu. */
  readonly leave: () => void;
  /** Le joueur arrive au menu, connecté. */
  readonly welcomed: () => void;
}

/**
 * Le compte : l'identité rendue par le serveur, et l'îlot de connexion quand il n'y en a
 * pas. L'identité vient d'un cookie de session : le client ne l'annonce jamais lui-même,
 * et sans compte la file d'attente répondrait 401.
 */
export class Account {
  private identity: auth.Identity = { signedIn: false };
  /** La première lecture, partie avant tout le reste ; les suivantes repartent du serveur. */
  private firstRequest: Promise<auth.Identity> | undefined;
  private readonly initialRoute: ReturnType<typeof routeOf>;
  /** Le message de retour porté par l'URL d'arrivée, montré une seule fois. */
  private arrival: ReturnType<typeof arrivalNotice>;
  private readonly renderForm = mountAccount(element<HTMLElement>("account-root"));

  constructor(
    firstRequest: Promise<auth.Identity>,
    private readonly effects: AccountEffects,
  ) {
    this.firstRequest = firstRequest;
    // Le parcours et le message de retour sont lus dans l'URL **avant** d'en retirer les
    // paramètres : le jeton de réinitialisation ne doit pas rester dans la barre
    // d'adresse, ni donc dans l'historique.
    this.initialRoute = routeOf(location.pathname, location.search);
    this.arrival = arrivalNotice(location.pathname, location.search);
    removeSearchSecrets();
  }

  get current(): auth.Identity {
    return this.identity;
  }

  /** La file et les défis sont ouverts à ce compte (adresse vérifiée). */
  get playable(): boolean {
    return auth.canPlay(this.identity);
  }

  /** Relit l'identité et en tire les écrans ; `message` s'affiche au menu. */
  async refresh(message?: string): Promise<void> {
    this.identity = await this.request();
    this.effects.shell.setIdentity(this.identity);
    await this.friendsBeforeMenu();
    this.effects.friends.sync();

    if (!this.identity.signedIn) this.signedOut();
    this.effects.go({ kind: "identity", signedIn: this.identity.signedIn });
    if (this.identity.signedIn) this.welcome(message);
  }

  /** Réécrit ce que le compte affiche, après un changement de langue. */
  render(): void {
    this.effects.shell.setIdentity(this.identity);
    if (!this.identity.signedIn) this.showForm();
  }

  signOut(): void {
    void auth.signOut().then(() => this.refresh());
  }

  /** L'administrateur rend l'identité d'emprunt et revient au back-office. */
  stopImpersonating(): void {
    this.effects.leave();
    void auth.stopImpersonating().then(() => location.assign("/admin/"));
  }

  resendVerification(): void {
    const m = messages().game.menu;
    const email = this.identity.email;
    this.effects.shell.notify(m.sending);
    void auth.resendVerification(email ?? "").then((outcome) => {
      const text = outcome.ok ? m.resent(email ?? m.yourAddress) : outcome.message;
      this.effects.shell.notify(text);
    });
  }

  private request(): Promise<auth.Identity> {
    const request = this.firstRequest ?? auth.whoAmI();
    this.firstRequest = undefined;
    return request;
  }

  /**
   * Le menu va paraître (premier écran, ou retour d'une connexion) : il attend sa liste
   * d'amis. Celle de l'amorce est déjà partie ; après une connexion, elle est à relire.
   */
  private async friendsBeforeMenu(): Promise<void> {
    const stage = this.effects.stage().kind;
    const menuComing = stage === "boot" || stage === "auth";
    if (!this.identity.signedIn || !menuComing) return;
    if (this.identity.emailVerified === false) return;
    await this.effects.friends.beforeMenu(stage !== "boot");
  }

  private signedOut(): void {
    // Une déconnexion referme la partie en cours : sans session, ni la file ni le Durable
    // Object n'accepteraient plus rien de ce client.
    const stage = this.effects.stage().kind;
    if (stage !== "auth" && stage !== "boot") this.effects.leave();
    // Le formulaire est dessiné avant que son écran soit montré : le panneau ne paraît
    // jamais vide.
    this.showForm();
  }

  private welcome(message: string | undefined): void {
    // Connecté sur une URL de parcours de compte (un lien de connexion ouvert alors qu'on
    // l'est déjà) : on revient à celle du menu.
    if (location.pathname !== "/") history.replaceState(null, "", "/");
    const notice = message ?? this.arrival?.text;
    if (notice !== undefined) this.effects.shell.notify(notice);
    this.arrival = undefined;
    this.effects.welcomed();
  }

  private showForm(): void {
    this.renderForm({
      initialRoute: this.initialRoute,
      initialNotice: this.arrival,
      providers: this.identity.providers ?? [],
      onSignedIn: (text) => void this.refresh(text),
      locale: currentLocale(),
    });
  }
}

/** Retire de l'URL les paramètres déjà lus, sans recharger la page. */
function removeSearchSecrets(): void {
  const cleaned = cleanedSearch(location.search);
  if (cleaned === location.search) return;
  history.replaceState(null, "", `${location.pathname}${cleaned}${location.hash}`);
}
