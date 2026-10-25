import { useRef, useState } from "react";
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
  Note,
  Pager,
  Person,
  QuickBar,
  SearchField,
  TileAvatar,
  useMessages,
  useToast,
} from "@occulis/ui";
import type { Friend, PlayerSearchResult } from "@occulis/protocol";
import { useLoad, whenReady } from "../load/hooks.js";
import * as resources from "./resources.js";
import { formatDate } from "../admin/model.js";
import * as friends from "../social/api.js";
import { friendOf, presenceLabel } from "../social/model.js";
import { profileHash } from "./model.js";
import { MatchReplayView, MatchTable, RecordCard } from "./parts.js";
import { useSocial } from "./SocialProvider.js";

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
                <SearchResultAction
                  player={player}
                  readOnly={readOnly}
                  onRelationChange={(relation) =>
                    setResults((current) =>
                      current.map((candidate) =>
                        candidate.id === player.id ? { ...candidate, relation } : candidate,
                      ),
                    )
                  }
                />
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

function SearchResultAction({
  player,
  readOnly,
  onRelationChange,
}: {
  player: PlayerSearchResult;
  readOnly: boolean;
  onRelationChange: (relation: "outgoing" | "friend") => void;
}) {
  const all = useMessages().social;
  const act = useAct();
  if (player.relation === "none") {
    return (
      <IconButton
        icon="userPlus"
        label={all.search.request(player.handle)}
        tipAlign="end"
        disabledReason={readOnly ? all.readOnly : undefined}
        onClick={() => {
          act(friends.requestFriend(player.id), all.toasts.requested(player.handle));
          onRelationChange("outgoing");
        }}
      />
    );
  }
  if (player.relation === "incoming") {
    return (
      <Button
        size="sm"
        disabled={readOnly}
        onClick={() => {
          act(friends.acceptRequest(player.id), all.toasts.friends(player.handle));
          onRelationChange("friend");
        }}
      >
        {all.search.accept}
      </Button>
    );
  }
  return <Badge tone="dim">{all.relations[player.relation]}</Badge>;
}

function FriendList({
  friends: list,
  readOnly,
}: {
  friends: readonly Friend[];
  readOnly: boolean;
}) {
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
          if (removing !== undefined)
            act(friends.removeFriend(removing.id), all.toasts.removed(removing.handle));
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
                  onClick={() =>
                    act(friends.acceptRequest(request.id), all.toasts.friends(request.handle))
                  }
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

export function FriendView({
  id,
  offset,
  readOnly,
}: {
  id: string;
  offset: number;
  readOnly: boolean;
}) {
  const all = useMessages().social;
  const m = all.friend;
  const off = readOnly ? all.readOnly : undefined;
  const act = useAct();
  const { state } = useSocial();
  const [blocking, setBlocking] = useState(false);
  // Les deux lectures sont parties ensemble au préchargement de la route (`resources.ts`).
  const { loaded } = useLoad(resources.friend(id));
  const page = useLoad(resources.friendMatches(id, offset)).loaded;

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
  let presence = online ? all.presence.online : all.presence.offline;
  if (live !== undefined) presence = presenceLabel(live);
  return (
    <>
      <BackLink href={profileHash({ view: "friends" })}>{m.back}</BackLink>
      <Hero
        avatar={<TileAvatar name={profile.handle} size="lg" />}
        title={profile.handle}
        badges={
          <BadgeRow>
            <Badge tone={online ? "strong" : "dim"}>{presence}</Badge>
            {!profile.allowSpectators && <Badge tone="dim">{m.noSpectators}</Badge>}
          </BadgeRow>
        }
        meta={[m.since(formatDate(profile.since))]}
        actions={
          <QuickBar framed>
            <IconButton
              icon="message"
              label={all.list.messages}
              onClick={() => (location.hash = profileHash({ view: "chat", id }))}
            />
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
            <MatchTable
              matches={page.value.matches}
              replayHref={(m) => profileHash({ view: "friendMatch", id, matchId: m.id })}
            />
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
  const { loaded } = useLoad(resources.friendMatch(id, matchId));
  const m = useMessages().social;
  const name = friendOf(useSocial().state, id)?.handle ?? m.friend.someone;
  return whenReady(loaded, (match) => (
    <MatchReplayView
      match={match}
      back={{ href: profileHash({ view: "friend", id, offset: 0 }), label: name }}
      friend={name}
    />
  ));
}
