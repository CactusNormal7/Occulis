import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMessages, useToast } from "@occulis/ui";
import type { FriendsOverview, SocialServerMessage } from "@occulis/protocol";
import { loadCache } from "../load/cache.js";
import { openSocial } from "../net/social-channel.js";
import { EMPTY_SOCIAL, type SocialState, receive, withOverview } from "../social/model.js";
import * as resources from "./resources.js";

interface SocialContext {
  readonly state: SocialState;
  /** Relit la liste, après une écriture ou une poussée qui la périme. */
  readonly reload: () => void;
  readonly update: (change: (state: SocialState) => SocialState) => void;
  /** S'abonne aux poussées du canal social ; rend de quoi se désabonner. */
  readonly listen: (listener: (message: SocialServerMessage) => void) => () => void;
}

const Social = createContext<SocialContext>({
  state: EMPTY_SOCIAL,
  reload: () => undefined,
  update: () => undefined,
  listen: () => () => undefined,
});

export function useSocial(): SocialContext {
  return useContext(Social);
}

/**
 * Tient l'état social de la page : la liste lue par `GET /api/friends`, retouchée par le
 * canal social (`surface=profile`). Fermé tant que le compte n'est pas vérifié — le
 * serveur refuserait de toute façon.
 */
export function SocialProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const notify = useToast();
  const toasts = useMessages().social.toasts;
  // Lu par le canal, ouvert une seule fois : la langue peut changer entre-temps.
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;
  // La liste est déjà là : la page l'a attendue avant de paraître (`WithFriends`, App.tsx).
  const [state, setState] = useState<SocialState>(() => {
    const known = loadCache.value<FriendsOverview>(resources.friendsOverview.key);
    return known === undefined ? EMPTY_SOCIAL : withOverview(EMPTY_SOCIAL, known);
  });
  const listeners = useRef(new Set<(message: SocialServerMessage) => void>());

  const reload = useCallback(() => {
    void loadCache.request(resources.friendsOverview, { force: true }).then((outcome) => {
      if (outcome.ok) setState((current) => withOverview(current, outcome.value));
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Relue à chaque ouverture du canal (dont la première), pour ne rien perdre de ce qu'il
    // aurait poussé entre la lecture de la page et son ouverture.
    const channel = openSocial(
      "profile",
      (message) => {
        let stale = false;
        setState((current) => {
          const next = receive(current, message);
          stale = next.stale;
          return next.state;
        });
        if (stale) reload();
        const t = toastsRef.current;
        if (message.kind === "friend-request") notify(t.friendRequest(message.from.handle));
        if (message.kind === "friend-accepted") notify(t.accepted(message.friend.handle));
        if (message.kind === "challenge") notify(t.challenged(message.challenge.from.handle));
        for (const listener of listeners.current) listener(message);
      },
      (status) => {
        if (status === "open") reload();
      },
    );
    return () => channel.close();
    // Un canal par activation : le rouvrir à chaque nouvelle identité de `notify` ou de
    // `reload` couperait le WebSocket à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const context: SocialContext = {
    state,
    reload,
    update: (change) => setState(change),
    listen: (listener) => {
      listeners.current.add(listener);
      return () => listeners.current.delete(listener);
    },
  };
  return <Social.Provider value={context}>{children}</Social.Provider>;
}
