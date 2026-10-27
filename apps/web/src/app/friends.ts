import type { PlayerId } from "@occulis/core";
import type { Challenge, Friend, SocialServerMessage } from "@occulis/protocol";
import { loadCache } from "../load/cache.js";
import { messages } from "../locale/current.js";
import { type SocialChannel, openSocial } from "../net/social-channel.js";
import { friendsOverview } from "../profile/resources.js";
import * as friendsApi from "../social/api.js";
import {
  EMPTY_SOCIAL,
  type SocialState,
  challenged,
  receive,
  withOverview,
} from "../social/model.js";
import type { FlowEvent, Stage } from "../ui/flow.js";
import {
  type FriendsPanel,
  type FriendsPanelElements,
  attachFriendsPanel,
} from "../ui/friends-panel.js";

/** Au-delà, le menu paraît sans attendre la liste d'amis. */
const MENU_DEADLINE_MS = 2500;

export interface FriendsEffects {
  readonly stage: () => Stage;
  readonly go: (event: FlowEvent) => void;
  readonly notify: (message: string) => void;
  /** Le compte peut jouer : son adresse est vérifiée. */
  readonly playable: () => boolean;
  /** Un défi accepté, d'un côté ou de l'autre : la partie est prête. */
  readonly matched: (matchId: string, seat: string) => void;
  readonly watch: (friend: string, matchId: string, side: PlayerId) => void;
}

/**
 * Les amis du menu : le panneau, le canal social qui le tient à jour, et le défi lancé
 * dont on attend la réponse.
 */
export class Friends {
  private channel: SocialChannel | undefined;
  private state: SocialState = EMPTY_SOCIAL;
  /** L'ami défié, tant que sa réponse est attendue. */
  private challengedFriend: string | undefined;
  private readonly panel: FriendsPanel;

  constructor(
    elements: FriendsPanelElements,
    private readonly effects: FriendsEffects,
  ) {
    this.panel = attachFriendsPanel({
      elements,
      onChallenge: (friend) => void this.challenge(friend),
      onWatch: (friend, live) => effects.watch(friend.handle, live.id, live.side),
      onAccept: (challenge) => void this.accept(challenge),
      onDecline: (challenge) => void friendsApi.declineChallenge(challenge.from.id),
    });
  }

  /** Le canal social suit l'identité : ouvert à un compte vérifié, refermé sinon. */
  sync(): void {
    const wanted = this.effects.playable();
    if (wanted && this.channel === undefined) this.open();
    if (!wanted && this.channel !== undefined) this.shut();
  }

  /** Relit la liste d'amis (relecture forcée par défaut) et redessine le panneau. */
  async reload(options: { force?: boolean } = { force: true }): Promise<void> {
    const outcome = await loadCache.request(friendsOverview, options);
    if (!outcome.ok) return;
    this.state = withOverview(this.state, outcome.value);
    this.render();
  }

  /**
   * La liste d'amis, avant de montrer le menu : le panneau paraît avec le reste au lieu
   * de pousser le menu une seconde plus tard. Au-delà de `MENU_DEADLINE_MS`, le menu paraît
   * sans elle — mieux vaut un panneau en retard qu'un menu qui n'arrive pas.
   */
  beforeMenu(force: boolean): Promise<void> {
    return Promise.race([this.reload({ force }), delay(MENU_DEADLINE_MS)]);
  }

  /** Retire le défi en attente, en quittant l'attente. */
  withdrawChallenge(): void {
    if (this.challengedFriend !== undefined) {
      void friendsApi.withdrawChallenge(this.challengedFriend);
    }
    this.challengedFriend = undefined;
  }

  /** Oublie le défi en attente, sans le retirer : une autre partie commence. */
  forgetChallenge(): void {
    this.challengedFriend = undefined;
  }

  private open(): void {
    this.channel = openSocial(
      "game",
      (message) => this.onMessage(message),
      (status) => {
        if (status === "open") void this.reload();
      },
    );
  }

  private shut(): void {
    this.channel?.close();
    this.channel = undefined;
    this.state = EMPTY_SOCIAL;
    this.render();
  }

  private render(): void {
    this.panel.render(this.state, this.effects.playable());
  }

  private async challenge(friend: Friend): Promise<void> {
    this.effects.notify("");
    const outcome = await friendsApi.challenge(friend.id);
    if (!outcome.ok) {
      this.effects.notify(outcome.message);
      return;
    }
    this.challengedFriend = friend.id;
    this.state = challenged(this.state, friend.id);
    this.effects.go({ kind: "seek", seeking: "challenge", friend: friend.handle });
  }

  private async accept(challenge: Challenge): Promise<void> {
    this.effects.notify("");
    const outcome = await friendsApi.acceptChallenge(challenge.from.id);
    // En cas de succès, `matched` arrive par le canal social et assied le joueur.
    if (!outcome.ok) this.effects.notify(outcome.message);
  }

  /** Une poussée du canal social. */
  private onMessage(message: SocialServerMessage): void {
    if (message.kind === "matched") {
      this.effects.matched(message.matchId, message.seat);
      return;
    }
    if (message.kind === "challenge-cancelled") this.onChallengeCancelled(message.to);
    if (message.kind === "challenge") this.onChallengeReceived(message.challenge);

    const update = receive(this.state, message);
    this.state = update.state;
    this.render();
    if (update.stale) void this.reload();
  }

  /** Le défi est tombé : si on l'attendait encore, retour au menu. */
  private onChallengeCancelled(to: string): void {
    const stage = this.effects.stage();
    if (to !== this.challengedFriend) return;
    if (stage.kind !== "waiting" || stage.seeking !== "challenge") return;

    const m = messages().social.menu;
    this.challengedFriend = undefined;
    this.effects.go({ kind: "menu" });
    this.effects.notify(m.declinedChallenge(stage.friend ?? m.yourFriend));
  }

  private onChallengeReceived(challenge: Challenge): void {
    if (this.effects.stage().kind !== "menu") return;
    this.effects.notify(messages().social.menu.challengesYou(challenge.from.handle));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
