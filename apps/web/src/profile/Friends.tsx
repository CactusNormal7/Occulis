import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  BackLink,
  Badge,
  BadgeRow,
  Button,
  Card,
  CardColumn,
  CardGrid,
  Dialog,
  EmptyState,
  Hero,
  IconButton,
  List,
  ListRow,
  MessageComposer,
  MessageThread,
  Note,
  Pager,
  Person,
  QuickBar,
  SearchField,
  TileAvatar,
  useMessages,
  useToast,
} from "@occulis/ui";
import type { ChatMessage, Friend, FriendsOverview, PlayerSearchResult, Relation, SocialServerMessage } from "@occulis/protocol";
import { useLoad, whenReady } from "../load/hooks.js";
import { loadCache } from "../load/cache.js";
import * as R from "./resources.js";
import { formatDate } from "../admin/model.js";
import { openSocial } from "../net/social-channel.js";
import * as friends from "../social/api.js";
import { EMPTY_SOCIAL, type SocialState, friendOf, presenceLabel, readAll, receive, withOverview } from "../social/model.js";
import { messageTime, profileHash } from "./model.js";
import { MatchReplayView, MatchTable, RecordCard } from "./parts.js";

/**
 * L'onglet « Amis » du profil : la liste et sa gestion, la fiche d'un ami (bilan,
 * historique, replay **de son point de vue**), et les messages. Défier et regarder une
 * partie se font depuis le jeu, seul à pouvoir s'asseoir à une table.
 *
 * Tout ce qui est grisé ici, le serveur le refuse aussi (`apps/server/src/social/`).
 */

// --- État partagé ---------------------------------------------------------------------

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
    const known = loadCache.value<FriendsOverview>(R.friendsOverview.key);
    return known === undefined ? EMPTY_SOCIAL : withOverview(EMPTY_SOCIAL, known);
  });
  const listeners = useRef(new Set<(message: SocialServerMessage) => void>());

  const reload = useCallback(() => {
    void loadCache.request(R.friendsOverview, { force: true }).then((outcome) => {
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

/** Un geste d'amis : il s'annonce, puis relit la liste. */
function useAct() {
  const notify = useToast();
  const { reload } = useSocial();
  return (pending: Promise<{ ok: true } | { ok: false; message: string }>, done: string) =>
    void pending.then((outcome) => {
      notify(outcome.ok ? done : outcome.message, outcome.ok);
      reload();
    });
}

// --- La liste -------------------------------------------------------------------------

export function FriendsView({ readOnly }: { readOnly: boolean }) {
  const m = useMessages().social;
  const { state } = useSocial();
  const overview = state.overview;
  if (overview === undefined) {
    return <EmptyState>{m.loading}</EmptyState>;
  }
  return (
    <CardGrid>
      <CardColumn>
        <SearchCard readOnly={readOnly} />
        <FriendList friends={overview.friends} readOnly={readOnly} />
      </CardColumn>
      <CardColumn>
        {state.incoming.length > 0 && (
          <Card title={m.challenges.title}>
            <List>
              {state.incoming.map((challenge) => (
                <ListRow key={challenge.from.id} end={<a href="/">{m.challenges.openGame}</a>}>
                  <strong>{m.challenges.from(challenge.from.handle)}</strong>
                  <small>{m.challenges.hint}</small>
                </ListRow>
              ))}
            </List>
          </Card>
        )}
        <Requests readOnly={readOnly} />
        <Blocked readOnly={readOnly} />
      </CardColumn>
    </CardGrid>
  );
}

/** Recherche par préfixe de pseudo, au fil de la frappe, à partir de deux caractères. */
function SearchCard({ readOnly }: { readOnly: boolean }) {
  const all = useMessages().social;
  const m = all.search;
  const act = useAct();
  const [results, setResults] = useState<readonly PlayerSearchResult[]>([]);
  const [prefix, setPrefix] = useState("");
  const generation = useRef(0);

  const lookup = (value: string) => {
    const trimmed = value.trim();
    setPrefix(trimmed);
    const current = ++generation.current;
    if ([...trimmed].length < 2) {
      setResults([]);
      return;
    }
    void friends.search(trimmed).then((outcome) => {
      // Une réponse arrivée après une frappe plus récente décrirait un autre préfixe.
      if (current === generation.current && outcome.ok) setResults(outcome.value);
    });
  };

  return (
    <Card title={m.title}>
      <SearchField placeholder={m.placeholder} onInput={lookup} onSearch={lookup} />
      {[...prefix].length >= 2 && (
        <List>
          {results.length === 0 && (
            <ListRow>
              <small>{m.none(prefix)}</small>
            </ListRow>
          )}
          {results.map((player) => (
            <ListRow
              key={player.id}
              end={
                player.relation === "none" ? (
                  <IconButton
                    icon="userPlus"
                    label={m.request(player.handle)}
                    tipAlign="end"
                    disabledReason={readOnly ? all.readOnly : undefined}
                    onClick={() => {
                      act(friends.requestFriend(player.id), all.toasts.requested(player.handle));
                      setResults((current) => current.map((p) => (p.id === player.id ? { ...p, relation: "outgoing" } : p)));
                    }}
                  />
                ) : player.relation === "incoming" ? (
                  <Button
                    size="sm"
                    disabled={readOnly}
                    onClick={() => {
                      act(friends.acceptRequest(player.id), all.toasts.friends(player.handle));
                      setResults((current) => current.map((p) => (p.id === player.id ? { ...p, relation: "friend" } : p)));
                    }}
                  >
                    {m.accept}
                  </Button>
                ) : (
                  // « none » et « incoming » ont leur geste ci-dessus : ne restent que les relations établies.
                  <Badge tone="dim">{all.relations[player.relation as Exclude<Relation, "none">]}</Badge>
                )
              }
            >
              <Person name={player.handle} />
            </ListRow>
          ))}
        </List>
      )}
    </Card>
  );
}

function FriendList({ friends: list, readOnly }: { friends: readonly Friend[]; readOnly: boolean }) {
  const all = useMessages().social;
  const m = all.list;
  const act = useAct();
  const [removing, setRemoving] = useState<Friend | undefined>(undefined);
  return (
    <Card title={m.title(list.length)}>
      {list.length === 0 ? (
        <EmptyState>{m.empty}</EmptyState>
      ) : (
        <List>
          {list.map((friend) => (
            <ListRow
              key={friend.id}
              end={
                <QuickBar>
                  <IconButton
                    icon="message"
                    label={friend.unread > 0 ? m.unreadMessages(friend.unread) : m.messages}
                    onClick={() => (location.hash = profileHash({ view: "chat", id: friend.id }))}
                  />
                  <IconButton
                    icon="close"
                    label={m.remove}
                    tipAlign="end"
                    danger
                    disabledReason={readOnly ? all.readOnly : undefined}
                    onClick={() => setRemoving(friend)}
                  />
                </QuickBar>
              }
            >
              <Person
                name={friend.handle}
                href={profileHash({ view: "friend", id: friend.id, offset: 0 })}
                detail={
                  <BadgeRow>
                    <Badge tone={friend.online ? "strong" : "dim"}>{presenceLabel(friend)}</Badge>
                    {friend.unread > 0 && <Badge tone="strong">{all.unread(friend.unread)}</Badge>}
                  </BadgeRow>
                }
              />
            </ListRow>
          ))}
        </List>
      )}
      <Dialog
        open={removing !== undefined}
        title={m.removeTitle}
        confirmLabel={m.removeConfirm}
        danger
        onClose={() => setRemoving(undefined)}
        onConfirm={() => {
          if (removing !== undefined) act(friends.removeFriend(removing.id), all.toasts.removed(removing.handle));
          return true;
        }}
      >
        {m.removeText(removing?.handle ?? "")}
      </Dialog>
    </Card>
  );
}

function Requests({ readOnly }: { readOnly: boolean }) {
  const all = useMessages().social;
  const m = all.requests;
  const off = readOnly ? all.readOnly : undefined;
  const act = useAct();
  const { state } = useSocial();
  const incoming = state.overview?.incoming ?? [];
  const outgoing = state.overview?.outgoing ?? [];
  if (incoming.length === 0 && outgoing.length === 0) return null;
  return (
    <Card title={m.title}>
      <List>
        {incoming.map((request) => (
          <ListRow
            key={`in-${request.id}`}
            end={
              <QuickBar>
                <IconButton
                  icon="check"
                  label={m.accept}
                  disabledReason={off}
                  onClick={() => act(friends.acceptRequest(request.id), all.toasts.friends(request.handle))}
                />
                <IconButton
                  icon="close"
                  label={m.decline}
                  disabledReason={off}
                  onClick={() => act(friends.declineRequest(request.id), all.toasts.declined)}
                />
                <IconButton
                  icon="ban"
                  label={m.block}
                  tipAlign="end"
                  danger
                  disabledReason={off}
                  onClick={() => act(friends.block(request.id), all.toasts.blocked(request.handle))}
                />
              </QuickBar>
            }
          >
            <Person name={request.handle} detail={m.incoming(formatDate(request.createdAt))} />
          </ListRow>
        ))}
        {outgoing.map((request) => (
          <ListRow
            key={`out-${request.id}`}
            end={
              <IconButton
                icon="close"
                label={m.withdraw}
                tipAlign="end"
                disabledReason={off}
                onClick={() => act(friends.cancelRequest(request.id), all.toasts.withdrawn)}
              />
            }
          >
            <Person name={request.handle} detail={m.outgoing(formatDate(request.createdAt))} />
          </ListRow>
        ))}
      </List>
    </Card>
  );
}

function Blocked({ readOnly }: { readOnly: boolean }) {
  const all = useMessages().social;
  const m = all.blocked;
  const act = useAct();
  const blocked = useSocial().state.overview?.blocked ?? [];
  if (blocked.length === 0) return null;
  return (
    <Card title={m.title}>
      <List>
        {blocked.map((player) => (
          <ListRow
            key={player.id}
            end={
              <IconButton
                icon="unban"
                label={m.unblock}
                tipAlign="end"
                disabledReason={readOnly ? all.readOnly : undefined}
                onClick={() => act(friends.unblock(player.id), all.toasts.unblocked(player.handle))}
              />
            }
          >
            <Person name={player.handle} detail={m.detail} />
          </ListRow>
        ))}
      </List>
    </Card>
  );
}

// --- La fiche d'un ami ----------------------------------------------------------------

export function FriendView({ id, offset, readOnly }: { id: string; offset: number; readOnly: boolean }) {
  const all = useMessages().social;
  const m = all.friend;
  const off = readOnly ? all.readOnly : undefined;
  const act = useAct();
  const { state } = useSocial();
  const [blocking, setBlocking] = useState(false);
  // Les deux lectures sont parties ensemble au préchargement de la route (`resources.ts`).
  const { loaded } = useLoad(R.friend(id));
  const page = useLoad(R.friendMatches(id, offset)).loaded;

  if (loaded.state === "failed") {
    return (
      <>
        <BackLink href={profileHash({ view: "friends" })}>{m.back}</BackLink>
        <EmptyState error>{loaded.message}</EmptyState>
      </>
    );
  }
  const profile = loaded.value;
  // La présence de la liste, tenue à jour par le canal social, prime sur celle lue au chargement.
  const live = friendOf(state, id);
  const online = live?.online ?? profile.online;
  return (
    <>
      <BackLink href={profileHash({ view: "friends" })}>{m.back}</BackLink>
      <Hero
        avatar={<TileAvatar name={profile.handle} size="lg" />}
        title={profile.handle}
        badges={
          <BadgeRow>
            <Badge tone={online ? "strong" : "dim"}>
              {live === undefined ? (online ? all.presence.online : all.presence.offline) : presenceLabel(live)}
            </Badge>
            {!profile.allowSpectators && <Badge tone="dim">{m.noSpectators}</Badge>}
          </BadgeRow>
        }
        meta={[m.since(formatDate(profile.since))]}
        actions={
          <QuickBar framed>
            <IconButton icon="message" label={all.list.messages} onClick={() => (location.hash = profileHash({ view: "chat", id }))} />
            <IconButton
              icon="close"
              label={all.list.remove}
              disabledReason={off}
              onClick={() => {
                act(friends.removeFriend(id), all.toasts.removed(profile.handle));
                location.hash = profileHash({ view: "friends" });
              }}
            />
            <IconButton
              icon="ban"
              label={all.requests.block}
              tipAlign="end"
              danger
              disabledReason={off}
              onClick={() => setBlocking(true)}
            />
          </QuickBar>
        }
      />
      {(live?.matches.length ?? 0) > 0 && (
        <Note>
          {m.live(profile.handle, live?.matches.length ?? 0)}{" "}
          {profile.allowSpectators ? <a href="/">{m.watchFromGame}</a> : m.refusesSpectators}
        </Note>
      )}
      <RecordCard record={profile.record} elo={profile.elo} />
      <Card title={m.matchesTitle(profile.handle)}>
        {page.state === "failed" && <EmptyState error>{page.message}</EmptyState>}
        {page.state === "ready" && (
          <>
            <MatchTable matches={page.value.matches} replayHref={(m) => profileHash({ view: "friendMatch", id, matchId: m.id })} />
            <Pager
              offset={offset}
              shown={page.value.matches.length}
              total={page.value.total}
              pageSize={friends.FRIEND_PAGE_SIZE}
              hrefFor={(next) => profileHash({ view: "friend", id, offset: next })}
            />
          </>
        )}
      </Card>
      <Dialog
        open={blocking}
        title={m.blockTitle(profile.handle)}
        confirmLabel={m.blockConfirm}
        danger
        onClose={() => setBlocking(false)}
        onConfirm={() => {
          act(friends.block(id), all.toasts.blocked(profile.handle));
          location.hash = profileHash({ view: "friends" });
          return true;
        }}
      >
        {m.blockText}
      </Dialog>
    </>
  );
}

export function FriendMatchReplay({ id, matchId }: { id: string; matchId: string }) {
  const { loaded } = useLoad(R.friendMatch(id, matchId));
  const m = useMessages().social;
  const name = friendOf(useSocial().state, id)?.handle ?? m.friend.someone;
  return whenReady(loaded, (match) => (
    <MatchReplayView match={match} back={{ href: profileHash({ view: "friend", id, offset: 0 }), label: name }} friend={name} />
  ));
}

// --- Les messages ---------------------------------------------------------------------

export function ChatView({ id, readOnly }: { id: string; readOnly: boolean }) {
  const all = useMessages().social;
  const m = all.chat;
  const notify = useToast();
  const { state, listen, update } = useSocial();
  const friend = friendOf(state, id);
  // Le fil lu avec l'écran ; s'y ajoutent ce que le canal pousse, ce qu'on envoie et les
  // messages plus anciens chargés à la demande.
  const { loaded } = useLoad(R.chat(id));
  const page = loaded.state === "ready" ? loaded.value : undefined;
  const failure = loaded.state === "failed" ? loaded.message : undefined;
  const [messages, setMessages] = useState<readonly ChatMessage[]>(() => page?.messages ?? []);
  const [hasMore, setHasMore] = useState(page?.hasMore ?? false);

  // Lire le fil le marque lu — sauf sous emprunt, où rien ne doit changer pour le joueur.
  const markRead = () => {
    if (readOnly) return;
    void friends.markRead(id);
    update((current) => readAll(current, id));
  };

  // Une relecture du fil s'y fond sans perdre ce qui est arrivé entre-temps.
  useEffect(() => {
    if (page === undefined) return;
    setMessages((current) => merged(page.messages, current));
    setHasMore(page.hasMore);
    markRead();
    // Chaque page relue, et elle seule : `markRead` est recréée à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const unlisten = listen((message) => {
      if (message.kind !== "message") return;
      const incoming = message.message;
      if (incoming.sender !== id && incoming.recipient !== id) return;
      setMessages((current) => withMessage(current, incoming));
      if (incoming.sender === id) markRead();
    });
    return unlisten;
    // Un abonnement par fil ; `listen` et `markRead` changent d'identité à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const older = () => {
    const first = messages[0];
    if (first === undefined) return;
    void friends.messages(id, first.createdAt).then((outcome) => {
      if (!outcome.ok) return;
      setMessages((current) => merged(outcome.value.messages, current));
      setHasMore(outcome.value.hasMore);
    });
  };

  const send = async (body: string): Promise<boolean> => {
    const outcome = await friends.sendMessage(id, body);
    if (!outcome.ok) {
      notify(outcome.message, false);
      return false;
    }
    const sent = outcome.value;
    setMessages((current) => withMessage(current, sent));
    return true;
  };

  const name = friend?.handle ?? all.friend.someone;
  const now = Date.now();
  return (
    <>
      <BackLink href={profileHash({ view: "friend", id, offset: 0 })}>{name}</BackLink>
      <Card title={m.title(name)}>
        {failure !== undefined ? (
          <EmptyState error>{failure}</EmptyState>
        ) : (
          <>
            <MessageThread
              empty={m.empty}
              more={
                hasMore && (
                  <Button size="sm" variant="ghost" onClick={older}>
                    {m.older}
                  </Button>
                )
              }
              messages={messages.map((message) => ({
                id: message.id,
                body: message.body,
                mine: message.sender !== id,
                meta: `${messageTime(message.createdAt, now)}${message.sender !== id && message.readAt !== null ? ` · ${m.read}` : ""}`,
              }))}
            />
            <MessageComposer
              onSend={send}
              disabled={readOnly}
              maxLength={500}
              placeholder={readOnly ? all.readOnly : m.placeholder}
              sendLabel={m.send}
            />
          </>
        )}
      </Card>
    </>
  );
}

/** Ajoute un message au fil, une seule fois : il peut arriver par l'envoi et par le canal. */
function withMessage(current: readonly ChatMessage[], message: ChatMessage): readonly ChatMessage[] {
  return current.some((m) => m.id === message.id) ? current : [...current, message];
}

/** Deux morceaux du même fil, sans doublon, dans l'ordre d'envoi. */
function merged(incoming: readonly ChatMessage[], current: readonly ChatMessage[]): readonly ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}
