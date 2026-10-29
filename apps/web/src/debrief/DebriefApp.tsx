import { Suspense } from "react";
import type { Locale } from "@occulis/i18n";
import type { MeMatchDebrief } from "@occulis/protocol";
import {
  Badge,
  Button,
  Card,
  CardColumn,
  CardGrid,
  ChoiceList,
  ChoiceRow,
  EmptyState,
  FactStrip,
  Hero,
  Note,
  PlayerPlate,
  ProgressBar,
  Reveal,
  Stat,
  StatGrid,
  Table,
  UiRoot,
  WorkInProgress,
  useMessages,
} from "@occulis/ui";
import { formatDate } from "../admin/model.js";
import { useLoad } from "../load/hooks.js";
import { MyResult, Replay } from "../profile/parts.js";
import * as api from "./api.js";
import { PLACEHOLDER, debriefStats, eloBefore, formatDuration } from "./model.js";

/**
 * L'écran de fin d'une partie jouée : le résultat, l'Elo des deux joueurs et ce qu'il a
 * bougé, quelques chiffres de la partie et son replay — la partie est finie, les deux
 * camps sont révélés. Ce qui n'est pas encore calculé (temps de réflexion, faits d'armes
 * de la partie) est montré **factice**, sous le ruban de chantier.
 *
 * L'écran ne paraît qu'une fois sa lecture arrivée : la racine la lance avant de le montrer.
 */
export interface DebriefAppProps {
  readonly locale: Locale;
  readonly matchId: string;
  readonly onPlayAgain: () => void;
  readonly onMenu: () => void;
}

export function DebriefApp({ locale, ...props }: DebriefAppProps) {
  return (
    <UiRoot locale={locale} fullPage>
      <main className="occ-page">
        <Suspense fallback={<ProgressBar active />}>
          <Debrief {...props} />
        </Suspense>
      </main>
    </UiRoot>
  );
}

function Debrief({ matchId, onPlayAgain, onMenu }: Omit<DebriefAppProps, "locale">) {
  const m = useMessages().game.debrief;
  const { loaded } = useLoad(api.debrief(matchId));
  if (loaded.state === "failed") {
    return (
      <EmptyState error action={<Button onClick={onMenu}>{m.menu}</Button>}>
        {loaded.message}
      </EmptyState>
    );
  }
  const match = loaded.value;
  const stats = debriefStats(match);
  const won = match.result === "won";
  const reason = won ? m.resignation.won(stats.endedOn) : m.resignation.lost(stats.endedOn);
  return (
    <>
      <Hero
        title={won ? m.victory : m.defeat}
        badges={<MyResult match={match} />}
        meta={[reason, formatDate(match.finishedAt)]}
        actions={
          <>
            <Button variant="ghost" onClick={onMenu}>
              {m.menu}
            </Button>
            <Button variant="primary" onClick={onPlayAgain}>
              {m.playAgain}
            </Button>
          </>
        }
      />
      <Players match={match} />
      <FactStrip
        facts={[
          {
            label: m.facts.duration,
            value: stats.durationMs === null ? "—" : formatDuration(stats.durationMs),
          },
          { label: m.facts.moves, value: String(match.log.length) },
          { label: m.facts.map, value: match.scenario },
          { label: m.facts.rules, value: match.rulesetVersion },
          { label: m.facts.finished, value: formatDate(match.finishedAt) },
        ]}
      />
      <CardGrid>
        <CardColumn>
          <Card title={m.stats.title}>
            <Table columns={["", m.stats.you, m.stats.them]} centered={[1, 2]} rowCount={3}>
              <tr>
                <td className="occ-muted">{m.stats.moves}</td>
                <td className="occ-center">{stats.self.moves}</td>
                <td className="occ-center">{stats.opponent.moves}</td>
              </tr>
              <tr>
                <td className="occ-muted">{m.stats.pieces}</td>
                <td className="occ-center">{stats.self.pieces}</td>
                <td className="occ-center">{stats.opponent.pieces}</td>
              </tr>
              <tr>
                <td className="occ-muted">{m.stats.seen}</td>
                <td className="occ-center">{stats.self.seen}</td>
                <td className="occ-center">{stats.opponent.seen}</td>
              </tr>
            </Table>
          </Card>
          <WorkInProgress note={m.stats.placeholder}>
            <Card>
              <StatGrid>
                <Stat
                  value={formatDuration(PLACEHOLDER.thinkingMs.average)}
                  label={m.stats.thinking}
                />
                <Stat
                  value={formatDuration(PLACEHOLDER.thinkingMs.longest)}
                  label={m.stats.longest}
                />
              </StatGrid>
            </Card>
          </WorkInProgress>
        </CardColumn>
        <CardColumn>
          <MatchFeats />
        </CardColumn>
      </CardGrid>
      <Replay match={match} />
    </>
  );
}

/** Les deux joueurs face à face, chacun dans son camp, avec ce que la partie a fait de son Elo. */
function Players({ match }: { match: MeMatchDebrief }) {
  const all = useMessages();
  const m = all.game.debrief;
  const change = all.profile.matches.ratingChange;
  const elo = (current: number, delta: number | null) =>
    delta === null
      ? m.elo(current)
      : m.eloChange(eloBefore(current, delta), current, change(delta));
  const opponent = match.seat === "A" ? "B" : "A";
  return (
    <Reveal
      versus={all.ui.versus.against}
      self={
        <PlayerPlate
          name={m.you}
          camp={match.seat}
          tag={all.ui.versus.seat(match.seat)}
          lines={[elo(match.elo, match.ratingChange)]}
        />
      }
      opponent={
        <PlayerPlate
          name={match.opponent}
          camp={opponent}
          tag={m.opponent}
          align="end"
          lines={[elo(match.opponentElo, match.opponentRatingChange)]}
        />
      }
      footer={<Badge tone="strong">{match.rated ? m.rated : m.unrated}</Badge>}
    />
  );
}

/** Les faits d'armes de la partie : factices tant qu'ils ne sont pas calculés par partie. */
function MatchFeats() {
  const all = useMessages();
  const m = all.game.debrief.feats;
  return (
    <WorkInProgress note={m.placeholder}>
      <Card title={m.title}>
        <Note>{m.lead}</Note>
        <ChoiceList label={m.title}>
          {PLACEHOLDER.feats.map((id) => (
            <ChoiceRow key={id}>
              <strong>{all.feats.names[id] ?? id}</strong>
              <small>{all.feats.descriptions[id] ?? ""}</small>
            </ChoiceRow>
          ))}
        </ChoiceList>
      </Card>
    </WorkInProgress>
  );
}
