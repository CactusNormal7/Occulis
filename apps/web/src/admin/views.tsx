import { useState } from "react";
import {
  BackLink,
  Badge,
  Banner,
  Button,
  Card,
  CardColumn,
  CardGrid,
  EmptyState,
  Hero,
  IconButton,
  InlineEdit,
  List,
  ListRow,
  PageHead,
  Pager,
  Person,
  SearchField,
  Segmented,
  Stat,
  StatGrid,
  StatTile,
  StatTileGrid,
  Table,
  TileAvatar,
  useMessages,
  useToast,
} from "@occulis/ui";
import type { AdminPlayer } from "@occulis/protocol";
import * as api from "./api.js";
import { CreateUserDialog, QuickActions, useAct, useGo } from "./actions.js";
import { useLoad } from "./hooks.js";
import { describeBan, formatDate, pageLabel, routeHash, shortAgent, winRate, type MatchStatus } from "./model.js";
import { MatchTable, StateBadges, whenReady } from "./shared.js";

/**
 * Les vues du back-office, faites des seules briques de `@occulis/ui`. Aucune classe ni
 * couleur propre à cette page : ce qui manquerait à la charte s'ajoute à la charte.
 */

const ACCOUNTS = { view: "users", search: "", offset: 0 } as const;
const GAMES = { view: "matches", status: null, offset: 0 } as const;

// --- Vue d'ensemble --------------------------------------------------------------------

export function Overview() {
  const t = useMessages().admin.overview;
  const { loaded } = useLoad("overview", async () => {
    const [stats, recent, newcomers] = await Promise.all([api.stats(), api.matches({ offset: 0, limit: 6 }), api.users("", 0)]);
    if (!stats.ok) return stats;
    return { ok: true as const, value: { stats: stats.value, recent, newcomers } };
  });

  return whenReady(loaded, ({ stats: s, recent, newcomers }) => (
    <>
      <PageHead title={t.title} />
      <StatTileGrid>
        <StatTile value={s.users} label={t.accounts} detail={t.lastWeek(s.signupsLastWeek)} href={routeHash(ACCOUNTS)} />
        <StatTile
          value={s.verifiedUsers}
          label={t.verified}
          detail={t.ofAccounts(s.users === 0 ? 0 : Math.round((s.verifiedUsers / s.users) * 100))}
        />
        <StatTile value={s.bannedUsers} label={t.banned} />
        <StatTile value={s.admins} label={t.admins} />
        <StatTile value={s.matches} label={t.matches} detail={t.lastWeek(s.matchesLastWeek)} href={routeHash(GAMES)} />
        <StatTile value={s.ongoingMatches} label={t.ongoing} href={routeHash({ view: "matches", status: "ongoing", offset: 0 })} />
        <StatTile value={s.actions} label={t.moves} />
        <StatTile value={s.players} label={t.players} detail={t.withoutAccount} />
      </StatTileGrid>
      <CardGrid>
        <Card title={t.recentMatches} action={<a href={routeHash(GAMES)}>{t.seeAll}</a>}>
          {recent.ok ? <MatchTable matches={recent.value.matches} compact /> : <EmptyState error>{recent.message}</EmptyState>}
        </Card>
        <Card title={t.newcomers} action={<a href={routeHash(ACCOUNTS)}>{t.seeAll}</a>}>
          {newcomers.ok ? (
            <List>
              {newcomers.value.users.slice(0, 6).map((user) => (
                <ListRow key={user.id} end={<StateBadges user={user} />}>
                  <Person name={user.name} detail={formatDate(user.createdAt)} href={routeHash({ view: "user", id: user.id })} />
                </ListRow>
              ))}
            </List>
          ) : (
            <EmptyState error>{newcomers.message}</EmptyState>
          )}
        </Card>
      </CardGrid>
    </>
  ));
}

// --- Comptes -----------------------------------------------------------------------------

export function UserList({ search, offset, self }: { search: string; offset: number; self: string }) {
  const t = useMessages().admin.users;
  const notify = useToast();
  const [creating, setCreating] = useState(false);
  const { loaded, reload } = useLoad(`users:${search}:${offset}`, () => api.users(search, offset));

  return (
    <>
      <PageHead
        title={t.title}
        count={loaded.state === "ready" ? loaded.value.total : undefined}
        tools={
          <>
            <SearchField
              defaultValue={search}
              placeholder={t.search}
              onSearch={(value) => (location.hash = routeHash({ view: "users", search: value, offset: 0 }))}
            />
            <Button icon="plus" onClick={() => setCreating(true)}>
              {t.create}
            </Button>
          </>
        }
      />
      {whenReady(loaded, ({ users, total }) => (
        <Card>
          <Table
            columns={[t.columns.account, t.columns.state, t.columns.signup, ""]}
            rowCount={users.length}
            empty={search.length > 0 ? t.noMatch(search) : t.none}
          >
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <Person name={user.name} detail={user.email} href={routeHash({ view: "user", id: user.id })} />
                </td>
                <td>
                  <StateBadges user={user} />
                </td>
                <td className="occ-muted">{formatDate(user.createdAt)}</td>
                <td className="occ-actions-cell">
                  <QuickActions
                    user={user}
                    self={self}
                    reload={reload}
                    onDeleted={() => {
                      notify(t.deleted(user.name));
                      reload();
                    }}
                  />
                </td>
              </tr>
            ))}
          </Table>
          <Pager
            offset={offset}
            shown={users.length}
            total={total}
            pageSize={api.PAGE_SIZE}
            hrefFor={(next) => routeHash({ view: "users", search, offset: next })}
          />
        </Card>
      ))}
      {creating && <CreateUserDialog onClose={() => setCreating(false)} />}
    </>
  );
}

export function UserDetail({ id, self }: { id: string; self: string }) {
  const t = useMessages().admin.user;
  const notify = useToast();
  const go = useGo();
  const { loaded, reload } = useLoad(`user:${id}`, async () => {
    const user = await api.user(id);
    if (!user.ok) return user;
    const playerId = user.value.playerId ?? undefined;
    const [sessions, player, history] = await Promise.all([
      api.sessions(id),
      playerId === undefined ? undefined : api.player(playerId),
      playerId === undefined ? undefined : api.matches({ player: playerId, offset: 0, limit: 6 }),
    ]);
    return { ok: true as const, value: { user: user.value, playerId, sessions, player, history } };
  });
  const act = useAct(reload);

  return whenReady(loaded, ({ user, playerId, sessions, player, history }) => {
    const sessionList = sessions.ok ? sessions.value.sessions : [];
    return (
      <>
        <BackLink href={routeHash(ACCOUNTS)}>{t.back}</BackLink>
        <Hero
          avatar={<TileAvatar name={user.name} size="lg" />}
          title={user.name}
          badges={<StateBadges user={user} />}
          meta={[
            user.email,
            t.signedUp(formatDate(user.createdAt)),
            <>
              <code>{user.id.slice(0, 10)}…</code>
              <IconButton
                icon="copy"
                label={t.copyId}
                onClick={() =>
                  void navigator.clipboard.writeText(user.id).then(
                    () => notify(t.copied),
                    () => notify(t.copyRefused, false),
                  )
                }
              />
            </>,
          ]}
          actions={
            <QuickActions
              framed
              user={user}
              self={self}
              reload={reload}
              onDeleted={() => go(ACCOUNTS, t.deleted(user.name))}
            />
          }
        />
        {user.banned === true && (
          <Banner action={<Button variant="danger" onClick={() => void act(api.unban(id), t.unbanned)}>{t.unban}</Button>}>
            {describeBan(user)}
          </Banner>
        )}
        <CardGrid>
          <CardColumn>
            {player?.ok === true ? (
              <ProfileCard player={player.value} />
            ) : (
              <Card title={t.gameProfile}>
                <EmptyState>{player?.ok === false ? player.message : t.noProfile}</EmptyState>
              </Card>
            )}
            {history?.ok === true && (
              <Card
                title={t.recentMatches}
                action={playerId !== undefined && <a href={routeHash({ view: "player", id: playerId })}>{t.fullHistory(history.value.total)}</a>}
              >
                <MatchTable matches={history.value.matches} compact />
              </Card>
            )}
          </CardColumn>
          <CardColumn>
            <Card title={t.edit}>
              {playerId !== undefined && (
                <InlineEdit
                  label={t.handle}
                  defaultValue={user.name}
                  action={t.rename}
                  onSubmit={(value) => act(api.rename(playerId, value), t.renamed)}
                />
              )}
              <InlineEdit
                label={t.address}
                type="email"
                defaultValue={user.email}
                action={t.change}
                onSubmit={(value) => act(api.update(id, { email: value }), t.addressChanged)}
              />
              <InlineEdit
                label={t.password}
                type="password"
                action={t.set}
                onSubmit={(value) => act(api.setPassword(id, value), t.passwordSet)}
              />
            </Card>
            <Card
              title={t.sessions(sessionList.length)}
              action={
                sessionList.length > 0 && (
                  <Button size="sm" icon="logout" onClick={() => void act(api.revokeSessions(id), t.sessionsClosed)}>
                    {t.closeAll}
                  </Button>
                )
              }
            >
              {!sessions.ok ? (
                <EmptyState error>{sessions.message}</EmptyState>
              ) : sessionList.length === 0 ? (
                <EmptyState>{t.noSessions}</EmptyState>
              ) : (
                <List>
                  {sessionList.map((session) => (
                    <ListRow
                      key={session.token}
                      end={
                        <IconButton
                          icon="close"
                          label={t.closeSession}
                          tipAlign="end"
                          onClick={() => void act(api.revokeSession(session.token), t.sessionClosed)}
                        />
                      }
                    >
                      <strong>{shortAgent(session.userAgent)}</strong>
                      <small>{t.sessionLine(session.ipAddress ?? t.unknownIp, formatDate(session.createdAt), formatDate(session.expiresAt))}</small>
                    </ListRow>
                  ))}
                </List>
              )}
            </Card>
          </CardColumn>
        </CardGrid>
      </>
    );
  });
}

// --- Profils ------------------------------------------------------------------------------

function ProfileCard({ player }: { player: AdminPlayer }) {
  const all = useMessages().admin;
  const t = all.profileCard;
  const { played, won, lost, ongoing } = player.record;
  const rate = winRate(player.record);
  return (
    <Card title={all.user.gameProfile}>
      <StatGrid>
        <Stat value={played} label={t.played} />
        <Stat value={won} label={t.won} />
        <Stat value={lost} label={t.lost} />
        <Stat value={ongoing} label={t.ongoing} />
        <Stat value={rate === null ? "—" : `${rate} %`} label={t.rate} />
        <Stat value={player.elo} label={t.elo} />
      </StatGrid>
    </Card>
  );
}

export function PlayerDetail({ id }: { id: string }) {
  const all = useMessages().admin;
  const t = all.player;
  const { loaded } = useLoad(`player:${id}`, async () => {
    const [player, history] = await Promise.all([api.player(id), api.matches({ player: id, offset: 0, limit: 100 })]);
    if (!player.ok) return player;
    return { ok: true as const, value: { player: player.value, history } };
  });

  return whenReady(loaded, ({ player: p, history }) => (
    <>
      {p.userId === null ? (
        <BackLink href={routeHash(ACCOUNTS)}>{all.user.back}</BackLink>
      ) : (
        <BackLink href={routeHash({ view: "user", id: p.userId })}>{t.accountRecord}</BackLink>
      )}
      <Hero
        avatar={<TileAvatar name={p.handle} size="lg" />}
        title={p.handle}
        badges={p.userId === null ? <Badge tone="dim">{all.badges.noAccount}</Badge> : undefined}
        meta={[t.created(formatDate(p.createdAt))]}
      />
      <ProfileCard player={p} />
      <Card
        title={t.history}
        action={history.ok && <span className="occ-muted">{pageLabel(0, history.value.matches.length, history.value.total)}</span>}
      >
        {history.ok ? <MatchTable matches={history.value.matches} /> : <EmptyState error>{history.message}</EmptyState>}
      </Card>
    </>
  ));
}

// --- Parties ------------------------------------------------------------------------------

export function MatchList({ status, offset }: { status: MatchStatus | null; offset: number }) {
  const t = useMessages().admin.matchList;
  const { loaded } = useLoad(`matches:${status}:${offset}`, () => api.matches({ status, offset }));
  const filters: { value: "all" | MatchStatus; label: string }[] = [
    { value: "all", label: t.all },
    { value: "ongoing", label: t.ongoing },
    { value: "finished", label: t.finished },
  ];
  return (
    <>
      <PageHead
        title={t.title}
        count={loaded.state === "ready" ? loaded.value.total : undefined}
        tools={
          <Segmented
            label={t.filter}
            value={status ?? "all"}
            options={filters.map((filter) => ({
              ...filter,
              href: routeHash({ view: "matches", status: filter.value === "all" ? null : filter.value, offset: 0 }),
            }))}
          />
        }
      />
      {whenReady(loaded, ({ matches, total }) => (
        <Card>
          <MatchTable matches={matches} />
          <Pager
            offset={offset}
            shown={matches.length}
            total={total}
            pageSize={api.PAGE_SIZE}
            hrefFor={(next) => routeHash({ view: "matches", status, offset: next })}
          />
        </Card>
      ))}
    </>
  );
}
