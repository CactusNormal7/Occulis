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
  const { loaded } = useLoad("overview", async () => {
    const [stats, recent, newcomers] = await Promise.all([api.stats(), api.matches({ offset: 0, limit: 6 }), api.users("", 0)]);
    if (!stats.ok) return stats;
    return { ok: true as const, value: { stats: stats.value, recent, newcomers } };
  });

  return whenReady(loaded, ({ stats: s, recent, newcomers }) => (
    <>
      <PageHead title="Vue d'ensemble" />
      <StatTileGrid>
        <StatTile value={s.users} label="comptes" detail={`+${s.signupsLastWeek} sur 7 jours`} href={routeHash(ACCOUNTS)} />
        <StatTile
          value={s.verifiedUsers}
          label="adresses vérifiées"
          detail={`${s.users === 0 ? 0 : Math.round((s.verifiedUsers / s.users) * 100)} % des comptes`}
        />
        <StatTile value={s.bannedUsers} label="suspendus" />
        <StatTile value={s.admins} label="administrateurs" />
        <StatTile value={s.matches} label="parties" detail={`+${s.matchesLastWeek} sur 7 jours`} href={routeHash(GAMES)} />
        <StatTile value={s.ongoingMatches} label="en cours" href={routeHash({ view: "matches", status: "ongoing", offset: 0 })} />
        <StatTile value={s.actions} label="coups joués" />
        <StatTile value={s.players} label="profils de jeu" detail="dont sans compte" />
      </StatTileGrid>
      <CardGrid>
        <Card title="Dernières parties" action={<a href={routeHash(GAMES)}>tout voir</a>}>
          {recent.ok ? <MatchTable matches={recent.value.matches} compact /> : <EmptyState error>{recent.message}</EmptyState>}
        </Card>
        <Card title="Derniers inscrits" action={<a href={routeHash(ACCOUNTS)}>tout voir</a>}>
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
  const notify = useToast();
  const [creating, setCreating] = useState(false);
  const { loaded, reload } = useLoad(`users:${search}:${offset}`, () => api.users(search, offset));

  return (
    <>
      <PageHead
        title="Comptes"
        count={loaded.state === "ready" ? loaded.value.total : undefined}
        tools={
          <>
            <SearchField
              defaultValue={search}
              placeholder="Pseudo ou adresse…"
              onSearch={(value) => (location.hash = routeHash({ view: "users", search: value, offset: 0 }))}
            />
            <Button icon="plus" onClick={() => setCreating(true)}>
              Nouveau compte
            </Button>
          </>
        }
      />
      {whenReady(loaded, ({ users, total }) => (
        <Card>
          <Table
            columns={["compte", "état", "inscription", ""]}
            rowCount={users.length}
            empty={search.length > 0 ? `Aucun compte ne correspond à « ${search} ».` : "Aucun compte."}
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
                      notify(`Compte ${user.name} supprimé.`);
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
        <BackLink href={routeHash(ACCOUNTS)}>Comptes</BackLink>
        <Hero
          avatar={<TileAvatar name={user.name} size="lg" />}
          title={user.name}
          badges={<StateBadges user={user} />}
          meta={[
            user.email,
            `inscrit le ${formatDate(user.createdAt)}`,
            <>
              <code>{user.id.slice(0, 10)}…</code>
              <IconButton
                icon="copy"
                label="Copier l'identifiant"
                onClick={() =>
                  void navigator.clipboard.writeText(user.id).then(
                    () => notify("Identifiant copié."),
                    () => notify("Copie refusée par le navigateur.", false),
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
              onDeleted={() => go(ACCOUNTS, `Compte ${user.name} supprimé. Son profil et ses parties restent.`)}
            />
          }
        />
        {user.banned === true && (
          <Banner action={<Button variant="danger" onClick={() => void act(api.unban(id), "Suspension levée.")}>Lever la suspension</Button>}>
            {describeBan(user)}
          </Banner>
        )}
        <CardGrid>
          <CardColumn>
            {player?.ok === true ? (
              <ProfileCard player={player.value} />
            ) : (
              <Card title="Profil de jeu">
                <EmptyState>{player?.ok === false ? player.message : "Aucun profil lié."}</EmptyState>
              </Card>
            )}
            {history?.ok === true && (
              <Card
                title="Dernières parties"
                action={playerId !== undefined && <a href={routeHash({ view: "player", id: playerId })}>tout l'historique ({history.value.total})</a>}
              >
                <MatchTable matches={history.value.matches} compact />
              </Card>
            )}
          </CardColumn>
          <CardColumn>
            <Card title="Modifier">
              {playerId !== undefined && (
                <InlineEdit
                  label="pseudo"
                  defaultValue={user.name}
                  action="Renommer"
                  onSubmit={(value) => act(api.rename(playerId, value), "Pseudo changé, sur le compte et sur le profil de jeu.")}
                />
              )}
              <InlineEdit
                label="adresse"
                type="email"
                defaultValue={user.email}
                action="Changer"
                onSubmit={(value) => act(api.update(id, { email: value }), "Adresse changée.")}
              />
              <InlineEdit
                label="mot de passe"
                type="password"
                action="Définir"
                onSubmit={(value) => act(api.setPassword(id, value), "Mot de passe défini.")}
              />
            </Card>
            <Card
              title={`Sessions ouvertes (${sessionList.length})`}
              action={
                sessionList.length > 0 && (
                  <Button size="sm" icon="logout" onClick={() => void act(api.revokeSessions(id), "Sessions fermées.")}>
                    tout fermer
                  </Button>
                )
              }
            >
              {!sessions.ok ? (
                <EmptyState error>{sessions.message}</EmptyState>
              ) : sessionList.length === 0 ? (
                <EmptyState>Aucune session ouverte.</EmptyState>
              ) : (
                <List>
                  {sessionList.map((session) => (
                    <ListRow
                      key={session.token}
                      end={
                        <IconButton
                          icon="close"
                          label="Fermer cette session"
                          tipAlign="end"
                          onClick={() => void act(api.revokeSession(session.token), "Session fermée.")}
                        />
                      }
                    >
                      <strong>{shortAgent(session.userAgent)}</strong>
                      <small>
                        {session.ipAddress ?? "IP inconnue"} · ouverte le {formatDate(session.createdAt)} · expire le{" "}
                        {formatDate(session.expiresAt)}
                      </small>
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
  const { played, won, lost, ongoing } = player.record;
  const rate = winRate(player.record);
  return (
    <Card title="Profil de jeu">
      <StatGrid>
        <Stat value={played} label="parties" />
        <Stat value={won} label="victoires" />
        <Stat value={lost} label="défaites" />
        <Stat value={ongoing} label="en cours" />
        <Stat value={rate === null ? "—" : `${rate} %`} label="taux" />
        <Stat value={player.elo} label="ELO" />
      </StatGrid>
    </Card>
  );
}

export function PlayerDetail({ id }: { id: string }) {
  const { loaded } = useLoad(`player:${id}`, async () => {
    const [player, history] = await Promise.all([api.player(id), api.matches({ player: id, offset: 0, limit: 100 })]);
    if (!player.ok) return player;
    return { ok: true as const, value: { player: player.value, history } };
  });

  return whenReady(loaded, ({ player: p, history }) => (
    <>
      {p.userId === null ? (
        <BackLink href={routeHash(ACCOUNTS)}>Comptes</BackLink>
      ) : (
        <BackLink href={routeHash({ view: "user", id: p.userId })}>Fiche du compte</BackLink>
      )}
      <Hero
        avatar={<TileAvatar name={p.handle} size="lg" />}
        title={p.handle}
        badges={p.userId === null ? <Badge tone="dim">sans compte</Badge> : undefined}
        meta={[`profil créé le ${formatDate(p.createdAt)}`]}
      />
      <ProfileCard player={p} />
      <Card
        title="Historique"
        action={history.ok && <span className="occ-muted">{pageLabel(0, history.value.matches.length, history.value.total)}</span>}
      >
        {history.ok ? <MatchTable matches={history.value.matches} /> : <EmptyState error>{history.message}</EmptyState>}
      </Card>
    </>
  ));
}

// --- Parties ------------------------------------------------------------------------------

export function MatchList({ status, offset }: { status: MatchStatus | null; offset: number }) {
  const { loaded } = useLoad(`matches:${status}:${offset}`, () => api.matches({ status, offset }));
  const filters: { value: "all" | MatchStatus; label: string }[] = [
    { value: "all", label: "toutes" },
    { value: "ongoing", label: "en cours" },
    { value: "finished", label: "terminées" },
  ];
  return (
    <>
      <PageHead
        title="Parties"
        count={loaded.state === "ready" ? loaded.value.total : undefined}
        tools={
          <Segmented
            label="Filtrer les parties"
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
