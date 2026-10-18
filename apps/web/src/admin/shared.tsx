import { Badge, BadgeRow, IconButton, Table, useMessages } from "@occulis/ui";
import type { AdminMatchSummary } from "@occulis/protocol";
import { describeResult, formatDate, isAdminRole, routeHash } from "./model.js";
import type { QuickUser } from "./actions.js";

/**
 * Les pastilles d'état d'un compte. Blanches ou estompées : la couleur reste réservée à
 * l'information de partie — seule la suspension prend la teinte des refus.
 */
export function StateBadges({ user }: { user: QuickUser }) {
  const m = useMessages().admin.badges;
  return (
    <BadgeRow>
      {isAdminRole(user.role) && <Badge tone="strong">{m.admin}</Badge>}
      {user.emailVerified ? <Badge>{m.verified}</Badge> : <Badge tone="dim">{m.unverified}</Badge>}
      {user.banned === true && <Badge tone="refused">{m.banned}</Badge>}
    </BadgeRow>
  );
}

/** Le résultat dans la couleur du camp vainqueur : c'est une information de partie. */
export function ResultBadge({ match }: { match: AdminMatchSummary }) {
  const m = useMessages().admin.result;
  return match.outcome === null ? (
    <Badge tone="dim">{m.ongoing}</Badge>
  ) : (
    <Badge tone={match.outcome.winner}>{describeResult(match)}</Badge>
  );
}

export function MatchTable({
  matches,
  compact = false,
}: {
  matches: readonly AdminMatchSummary[];
  compact?: boolean;
}) {
  const t = useMessages().admin.matchTable;
  const c = t.columns;
  return (
    <Table
      columns={compact ? [c.match, c.result, ""] : [c.start, c.match, c.result, c.moves, ""]}
      rowCount={matches.length}
      empty={t.empty}
    >
      {matches.map((m) => (
        <tr key={m.id}>
          {!compact && <td className="occ-muted">{formatDate(m.startedAt)}</td>}
          <td>
            <a href={routeHash({ view: "player", id: m.playerA.id })}>{m.playerA.handle}</a>
            <span className="occ-muted">{t.against}</span>
            <a href={routeHash({ view: "player", id: m.playerB.id })}>{m.playerB.handle}</a>
            {compact && (
              <small className="occ-muted" style={{ display: "block" }}>
                {formatDate(m.startedAt)}
              </small>
            )}
          </td>
          <td>
            <ResultBadge match={m} />
          </td>
          {!compact && <td className="occ-muted">{m.actions}</td>}
          <td className="occ-actions-cell">
            <IconButton
              icon="eye"
              label={t.view}
              tipAlign="end"
              onClick={() => (location.hash = routeHash({ view: "match", id: m.id }))}
            />
          </td>
        </tr>
      ))}
    </Table>
  );
}
