import {
  computed,
  inject,
  provide,
  shallowRef,
  watch,
  type InjectionKey,
  type ShallowRef,
} from "vue";
import type { FriendsOverview, SocialServerMessage } from "@occulis/protocol";
import { useMessages, useToast } from "@occulis/ui";
import { loadCache } from "../load/cache.js";
import { openSocial } from "../net/social-channel.js";
import { EMPTY_SOCIAL, receive, withOverview, type SocialState } from "../social/model.js";
import * as R from "./resources.js";

/**
 * L'état social de la page de profil : la liste lue par `GET /api/friends`, retouchée par le
 * canal social (`surface=profile`). La page la tient (`provideSocial`), les vues la lisent
 * (`useSocial`).
 */
export interface Social {
  readonly state: Readonly<ShallowRef<SocialState>>;
  /** Relit la liste, après une écriture ou une poussée qui la périme. */
  readonly reload: () => void;
  readonly update: (change: (state: SocialState) => SocialState) => void;
  /** S'abonne aux poussées du canal social ; rend de quoi se désabonner. */
  readonly listen: (listener: (message: SocialServerMessage) => void) => () => void;
}

const SOCIAL_KEY: InjectionKey<Social> = Symbol("profile-social");

/**
 * Ouvre l'état social de la page. Le canal reste fermé tant que `enabled` est faux — compte
 * non vérifié, ou session d'emprunt : le serveur refuserait de toute façon.
 */
export function provideSocial(enabled: () => boolean): Social {
  const notify = useToast();
  const messages = useMessages();
  const toasts = computed(() => messages.value.social.toasts);

  // La liste est déjà là quand le compte est vérifié : la page l'a attendue avant de paraître.
  const known = loadCache.value<FriendsOverview>(R.friendsOverview.key);
  const state = shallowRef(known === undefined ? EMPTY_SOCIAL : withOverview(EMPTY_SOCIAL, known));
  const listeners = new Set<(message: SocialServerMessage) => void>();

  function reload() {
    void loadCache.request(R.friendsOverview, { force: true }).then((outcome) => {
      if (outcome.ok) state.value = withOverview(state.value, outcome.value);
    });
  }

  function announce(message: SocialServerMessage) {
    const text = toasts.value;
    if (message.kind === "friend-request") notify(text.friendRequest(message.from.handle));
    if (message.kind === "friend-accepted") notify(text.accepted(message.friend.handle));
    if (message.kind === "challenge") notify(text.challenged(message.challenge.from.handle));
  }

  function onPush(message: SocialServerMessage) {
    const next = receive(state.value, message);
    state.value = next.state;
    if (next.stale) reload();
    announce(message);
    for (const listener of listeners) listener(message);
  }

  // Un canal par activation. La liste est relue à chaque ouverture (dont la première), pour
  // ne rien perdre de ce qu'il aurait poussé entre la lecture de la page et son ouverture.
  watch(
    enabled,
    (open, _previous, onCleanup) => {
      if (!open) return;
      const channel = openSocial("profile", onPush, (status) => {
        if (status === "open") reload();
      });
      onCleanup(() => channel.close());
    },
    { immediate: true },
  );

  const social: Social = {
    state,
    reload,
    update: (change) => {
      state.value = change(state.value);
    },
    listen: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  provide(SOCIAL_KEY, social);
  return social;
}

export function useSocial(): Social {
  const social = inject(SOCIAL_KEY, null);
  if (social === null) throw new Error("useSocial outside the profile page");
  return social;
}

/** Un geste d'amis : il s'annonce, puis relit la liste. */
export function useFriendAct(): (
  pending: Promise<{ ok: true } | { ok: false; message: string }>,
  done: string,
) => void {
  const notify = useToast();
  const { reload } = useSocial();
  return (pending, done) =>
    void pending.then((outcome) => {
      notify(outcome.ok ? done : outcome.message, outcome.ok);
      reload();
    });
}
