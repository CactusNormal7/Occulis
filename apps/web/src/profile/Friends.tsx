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
  useToast,
} from "@occulis/ui";
import type { ChatMessage, Friend, PlayerSearchResult, SocialServerMessage } from "@occulis/protocol";
import { useLoad } from "../admin/hooks.js";
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
  const [state, setState] = useState<SocialState>(EMPTY_SOCIAL);
  const listeners = useRef(new Set<(message: SocialServerMessage) => void>());

  const reload = useCallback(() => {
    void friends.overview().then((outcome) => {
      if (outcome.ok) setState((current) => withOverview(current, outcome.value));
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
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
        if (message.kind === "friend-request") notify(`${message.from.handle} vous demande en ami.`);
        if (message.kind === "friend-accepted") notify(`${message.friend.handle} a accepté votre demande.`);
        if (message.kind === "challenge") notify(`${message.challenge.from.handle} vous défie : ouvrez le jeu pour répondre.`);
        for (const listener of listeners.current) listener(message);
      },
      (status) => {
        if (status === "open") reload();
      },
    );
    return () => channel.close();
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

const READ_ONLY = "Session d'emprunt : lecture seule";

// --- La liste -------------------------------------------------------------------------

export function FriendsView({ readOnly }: { readOnly: boolean }) {
  const { state } = useSocial();
  const overview = state.overview;
  if (overview === undefined) {
    return <EmptyState>Chargement des amis… (une adresse vérifiée est nécessaire)</EmptyState>;
  }
  return (
    <CardGrid>
      <CardColumn>
        <SearchCard readOnly={readOnly} />
        <FriendList friends={overview.friends} readOnly={readOnly} />
      </CardColumn>
      <CardColumn>
        {state.incoming.length > 0 && (
          <Card title="Défis reçus">
            <List>
              {state.incoming.map((challenge) => (
                <ListRow key={challenge.from.id} end={<a href="/">ouvrir le jeu →</a>}>
                  <strong>{challenge.from.handle} vous défie</strong>
                  <small>Le défi se relève depuis le menu du jeu.</small>
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
    <Card title="Ajouter un ami">
      <SearchField placeholder="Pseudo…" onInput={lookup} onSearch={lookup} />
      {[...prefix].length >= 2 && (
        <List>
          {results.length === 0 && (
            <ListRow>
              <small>Aucun joueur ne commence par « {prefix} ».</small>
            </ListRow>
          )}
          {results.map((player) => (
            <ListRow
              key={player.id}
              end={
                player.relation === "none" ? (
                  <IconButton
                    icon="userPlus"
                    label={`Demander ${player.handle} en ami`}
                    tipAlign="end"
                    disabledReason={readOnly ? READ_ONLY : undefined}
                    onClick={() => {
                      act(friends.requestFriend(player.id), `Demande envoyée à ${player.handle}.`);
                      setResults((current) => current.map((p) => (p.id === player.id ? { ...p, relation: "outgoing" } : p)));
                    }}
                  />
                ) : player.relation === "incoming" ? (
                  <Button
                    size="sm"
                    disabled={readOnly}
                    onClick={() => {
                      act(friends.acceptRequest(player.id), `${player.handle} et vous êtes amis.`);
                      setResults((current) => current.map((p) => (p.id === player.id ? { ...p, relation: "friend" } : p)));
                    }}
                  >
                    Accepter
                  </Button>
                ) : (
                  <Badge tone="dim">{RELATION_LABELS[player.relation]}</Badge>
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

const RELATION_LABELS = {
  friend: "ami",
  outgoing: "demande envoyée",
  incoming: "vous a demandé",
  blocked: "bloqué",
  none: "",
} as const;

function FriendList({ friends: list, readOnly }: { friends: readonly Friend[]; readOnly: boolean }) {
  const act = useAct();
  const [removing, setRemoving] = useState<Friend | undefined>(undefined);
  return (
    <Card title={`Amis (${list.length})`}>
      {list.length === 0 ? (
        <EmptyState>Aucun ami pour l'instant : cherchez un pseudo ci-dessus, ou ajoutez un adversaire depuis vos parties.</EmptyState>
      ) : (
        <List>
          {list.map((friend) => (
            <ListRow
              key={friend.id}
              end={
                <QuickBar>
                  <IconButton
                    icon="message"
                    label={friend.unread > 0 ? `${friend.unread} message(s) non lu(s)` : "Messages"}
                    onClick={() => (location.hash = profileHash({ view: "chat", id: friend.id }))}
                  />
                  <IconButton
                    icon="close"
                    label="Retirer de mes amis"
                    tipAlign="end"
                    danger
                    disabledReason={readOnly ? READ_ONLY : undefined}
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
                    {friend.unread > 0 && <Badge tone="strong">{friend.unread} non lu{friend.unread > 1 ? "s" : ""}</Badge>}
                  </BadgeRow>
                }
              />
            </ListRow>
          ))}
        </List>
      )}
      <Dialog
        open={removing !== undefined}
        title="Retirer cet ami"
        confirmLabel="Retirer"
        danger
        onClose={() => setRemoving(undefined)}
        onConfirm={() => {
          if (removing !== undefined) act(friends.removeFriend(removing.id), `${removing.handle} n'est plus votre ami.`);
          return true;
        }}
      >
        {removing?.handle} ne sera plus dans votre liste, et vos messages ne s'afficheront plus. Vous pourrez le redemander en
        ami.
      </Dialog>
    </Card>
  );
}

function Requests({ readOnly }: { readOnly: boolean }) {
  const act = useAct();
  const { state } = useSocial();
  const incoming = state.overview?.incoming ?? [];
  const outgoing = state.overview?.outgoing ?? [];
  if (incoming.length === 0 && outgoing.length === 0) return null;
  return (
    <Card title="Demandes">
      <List>
        {incoming.map((request) => (
          <ListRow
            key={`in-${request.id}`}
            end={
              <QuickBar>
                <IconButton
                  icon="check"
                  label="Accepter"
                  disabledReason={readOnly ? READ_ONLY : undefined}
                  onClick={() => act(friends.acceptRequest(request.id), `${request.handle} et vous êtes amis.`)}
                />
                <IconButton
                  icon="close"
                  label="Refuser"
                  disabledReason={readOnly ? READ_ONLY : undefined}
                  onClick={() => act(friends.declineRequest(request.id), "Demande refusée.")}
                />
                <IconButton
                  icon="ban"
                  label="Bloquer"
                  tipAlign="end"
                  danger
                  disabledReason={readOnly ? READ_ONLY : undefined}
                  onClick={() => act(friends.block(request.id), `${request.handle} est bloqué.`)}
                />
              </QuickBar>
            }
          >
            <Person name={request.handle} detail={`vous demande en ami · ${formatDate(request.createdAt)}`} />
          </ListRow>
        ))}
        {outgoing.map((request) => (
          <ListRow
            key={`out-${request.id}`}
            end={
              <IconButton
                icon="close"
                label="Retirer la demande"
                tipAlign="end"
                disabledReason={readOnly ? READ_ONLY : undefined}
                onClick={() => act(friends.cancelRequest(request.id), "Demande retirée.")}
              />
            }
          >
            <Person name={request.handle} detail={`demande envoyée · ${formatDate(request.createdAt)}`} />
          </ListRow>
        ))}
      </List>
    </Card>
  );
}

function Blocked({ readOnly }: { readOnly: boolean }) {
  const act = useAct();
  const blocked = useSocial().state.overview?.blocked ?? [];
  if (blocked.length === 0) return null;
  return (
    <Card title="Joueurs bloqués">
      <List>
        {blocked.map((player) => (
          <ListRow
            key={player.id}
            end={
              <IconButton
                icon="unban"
                label="Débloquer"
                tipAlign="end"
                disabledReason={readOnly ? READ_ONLY : undefined}
                onClick={() => act(friends.unblock(player.id), `${player.handle} est débloqué.`)}
              />
            }
          >
            <Person name={player.handle} detail="ne peut ni vous trouver, ni vous écrire, ni vous défier" />
          </ListRow>
        ))}
      </List>
    </Card>
  );
}

// --- La fiche d'un ami ----------------------------------------------------------------

export function FriendView({ id, offset, readOnly }: { id: string; offset: number; readOnly: boolean }) {
  const act = useAct();
  const { state } = useSocial();
  const { loaded } = useLoad(`friend:${id}`, () => friends.friend(id));
  const page = useLoad(`friend:${id}:matches:${offset}`, () => friends.friendMatches(id, offset)).loaded;
  const [blocking, setBlocking] = useState(false);

  if (loaded.state === "loading") return null;
  if (loaded.state === "failed") {
    return (
      <>
        <BackLink href={profileHash({ view: "friends" })}>Amis</BackLink>
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
      <BackLink href={profileHash({ view: "friends" })}>Amis</BackLink>
      <Hero
        avatar={<TileAvatar name={profile.handle} size="lg" />}
        title={profile.handle}
        badges={
          <BadgeRow>
            <Badge tone={online ? "strong" : "dim"}>{live === undefined ? (online ? "en ligne" : "absent") : presenceLabel(live)}</Badge>
            {!profile.allowSpectators && <Badge tone="dim">sans spectateurs</Badge>}
          </BadgeRow>
        }
        meta={[`ami depuis le ${formatDate(profile.since)}`]}
        actions={
          <QuickBar framed>
            <IconButton icon="message" label="Messages" onClick={() => (location.hash = profileHash({ view: "chat", id }))} />
            <IconButton
              icon="close"
              label="Retirer de mes amis"
              disabledReason={readOnly ? READ_ONLY : undefined}
              onClick={() => {
                act(friends.removeFriend(id), `${profile.handle} n'est plus votre ami.`);
                location.hash = profileHash({ view: "friends" });
              }}
            />
            <IconButton
              icon="ban"
              label="Bloquer"
              tipAlign="end"
              danger
              disabledReason={readOnly ? READ_ONLY : undefined}
              onClick={() => setBlocking(true)}
            />
          </QuickBar>
        }
      />
      {(live?.matches.length ?? 0) > 0 && (
        <Note>
          {profile.handle} a {live?.matches.length} partie(s) en cours.{" "}
          {profile.allowSpectators ? <a href="/">Regardez-les depuis le menu du jeu →</a> : "Il n'accepte pas les spectateurs."}
        </Note>
      )}
      <RecordCard record={profile.record} />
      <Card title={`Parties de ${profile.handle}`}>
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
        title={`Bloquer ${profile.handle}`}
        confirmLabel="Bloquer"
        danger
        onClose={() => setBlocking(false)}
        onConfirm={() => {
          act(friends.block(id), `${profile.handle} est bloqué.`);
          location.hash = profileHash({ view: "friends" });
          return true;
        }}
      >
        Il ne sera plus votre ami, ne pourra plus vous trouver, vous écrire ni vous défier. Il n'en sera pas averti.
      </Dialog>
    </>
  );
}

export function FriendMatchReplay({ id, matchId }: { id: string; matchId: string }) {
  const { loaded } = useLoad(`friend:${id}:match:${matchId}`, () => friends.friendMatch(id, matchId));
  const name = friendOf(useSocial().state, id)?.handle ?? "votre ami";
  if (loaded.state === "loading") return null;
  if (loaded.state === "failed") return <EmptyState error>{loaded.message}</EmptyState>;
  const m = loaded.value;
  return (
    <MatchReplayView
      match={m}
      back={{ href: profileHash({ view: "friend", id, offset: 0 }), label: name }}
      self={name}
      title={`${name} contre ${m.opponent}`}
    />
  );
}

// --- Les messages ---------------------------------------------------------------------

export function ChatView({ id, readOnly }: { id: string; readOnly: boolean }) {
  const notify = useToast();
  const { state, listen, update } = useSocial();
  const friend = friendOf(state, id);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);

  // Lire le fil le marque lu — sauf sous emprunt, où rien ne doit changer pour le joueur.
  const markRead = () => {
    if (readOnly) return;
    void friends.markRead(id);
    update((current) => readAll(current, id));
  };

  useEffect(() => {
    setMessages([]);
    void friends.messages(id).then((outcome) => {
      if (!outcome.ok) {
        setFailure(outcome.message);
        return;
      }
      setMessages(outcome.value.messages);
      setHasMore(outcome.value.hasMore);
      markRead();
    });
    return listen((message) => {
      if (message.kind !== "message") return;
      const incoming = message.message;
      if (incoming.sender !== id && incoming.recipient !== id) return;
      setMessages((current) => (current.some((m) => m.id === incoming.id) ? current : [...current, incoming]));
      if (incoming.sender === id) markRead();
    });
  }, [id]);

  const older = () => {
    const first = messages[0];
    if (first === undefined) return;
    void friends.messages(id, first.createdAt).then((outcome) => {
      if (!outcome.ok) return;
      setMessages((current) => [...outcome.value.messages, ...current]);
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
    setMessages((current) => (current.some((m) => m.id === sent.id) ? current : [...current, sent]));
    return true;
  };

  const name = friend?.handle ?? "votre ami";
  const now = Date.now();
  return (
    <>
      <BackLink href={profileHash({ view: "friend", id, offset: 0 })}>{name}</BackLink>
      <Card title={`Messages avec ${name}`}>
        {failure !== undefined ? (
          <EmptyState error>{failure}</EmptyState>
        ) : (
          <>
            <MessageThread
              empty="Aucun message : écrivez le premier."
              more={
                hasMore && (
                  <Button size="sm" variant="ghost" onClick={older}>
                    messages précédents
                  </Button>
                )
              }
              messages={messages.map((message) => ({
                id: message.id,
                body: message.body,
                mine: message.sender !== id,
                meta: `${messageTime(message.createdAt, now)}${message.sender !== id && message.readAt !== null ? " · lu" : ""}`,
              }))}
            />
            <MessageComposer onSend={send} disabled={readOnly} maxLength={500} placeholder={readOnly ? READ_ONLY : undefined} />
          </>
        )}
      </Card>
    </>
  );
}
