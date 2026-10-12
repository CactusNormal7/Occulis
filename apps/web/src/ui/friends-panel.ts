import type { Challenge, Friend, LiveMatch } from "@occulis/protocol";
import { type SocialState, presenceLabel } from "../social/model.js";

/**
 * Le panneau « Amis » du menu : défis reçus, puis amis avec leur présence, de quoi les
 * défier ou regarder leur partie. La gestion de la liste (ajouts, blocages, messages)
 * vit dans le profil, vers lequel le panneau renvoie.
 *
 * Comme `shell.ts`, il montre et rend les gestes : il n'appelle jamais le réseau.
 */
export interface FriendsPanelElements {
  readonly root: HTMLElement;
  readonly challenges: HTMLElement;
  readonly list: HTMLElement;
  readonly empty: HTMLElement;
}

export interface FriendsPanelOptions {
  readonly elements: FriendsPanelElements;
  readonly onChallenge: (friend: Friend) => void;
  readonly onWatch: (friend: Friend, match: LiveMatch) => void;
  readonly onAccept: (challenge: Challenge) => void;
  readonly onDecline: (challenge: Challenge) => void;
}

export interface FriendsPanel {
  /** `playable` : la file et les défis sont ouverts à ce compte (adresse vérifiée). */
  render(state: SocialState, playable: boolean): void;
}

export function attachFriendsPanel(options: FriendsPanelOptions): FriendsPanel {
  const e = options.elements;

  const button = (label: string, act: () => void, disabled = false): HTMLButtonElement => {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "quiet";
    node.textContent = label;
    node.disabled = disabled;
    node.addEventListener("click", act);
    return node;
  };

  const challengeRow = (challenge: Challenge, playable: boolean): HTMLLIElement => {
    const row = document.createElement("li");
    row.className = "friend friend--challenge";
    const text = document.createElement("span");
    text.className = "friend__name";
    text.textContent = `${challenge.from.handle} vous défie`;
    row.append(
      text,
      button("Accepter", () => options.onAccept(challenge), !playable),
      button("Refuser", () => options.onDecline(challenge)),
    );
    return row;
  };

  const friendRow = (friend: Friend, outgoing: boolean, playable: boolean): HTMLLIElement => {
    const row = document.createElement("li");
    row.className = "friend";
    row.dataset["online"] = String(friend.online);

    const name = document.createElement("a");
    name.className = "friend__name";
    name.href = `/profil/#/amis/${encodeURIComponent(friend.id)}`;
    name.textContent = friend.handle;

    const presence = document.createElement("small");
    presence.className = "friend__presence";
    presence.textContent =
      friend.unread > 0 ? `${presenceLabel(friend)} · ${friend.unread} non lu${friend.unread > 1 ? "s" : ""}` : presenceLabel(friend);

    row.append(name, presence);
    if (outgoing) row.append(button("Défi envoyé", () => undefined, true));
    else if (friend.online) row.append(button("Défier", () => options.onChallenge(friend), !playable));

    for (const match of friend.matches) {
      if (!match.watchable) continue;
      row.append(button(`Regarder (contre ${match.opponent})`, () => options.onWatch(friend, match)));
    }
    return row;
  };

  return {
    render: (state, playable) => {
      const overview = state.overview;
      e.root.hidden = overview === undefined;
      if (overview === undefined) return;

      e.challenges.replaceChildren(...state.incoming.map((challenge) => challengeRow(challenge, playable)));
      e.list.replaceChildren(
        ...overview.friends.map((friend) => friendRow(friend, state.outgoing.includes(friend.id), playable)),
      );
      e.empty.hidden = overview.friends.length > 0;
    },
  };
}
