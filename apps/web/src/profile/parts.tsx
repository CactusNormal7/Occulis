import { useMemo, useState, type ReactNode } from "react";
import {
  BackLink,
  Badge,
  Banner,
  Card,
  EmptyState,
  FactStrip,
  Hero,
  IconButton,
  QuickBar,
  Stat,
  StatGrid,
  Table,
  Toolbar,
  ToolbarText,
  useMessages,
} from "@occulis/ui";
import type { MeMatchDetail, MeMatchSummary, MeRecord } from "@occulis/protocol";
import { boardForScenario } from "../game/scenario.js";
import { ReplayBoard } from "../admin/ReplayBoard.js";
import { clampFrame } from "../admin/replay.js";
import { formatDate, winRate } from "../admin/model.js";
import { asBoardFrames, describeMyResult } from "./model.js";

/**
 * Les briques communes à ses propres parties et à celles d'un ami : un bilan, une table
 * d'historique, un replay. Elles montrent toujours **un** camp — le sien, ou celui de
 * l'ami — car c'est tout ce que le serveur rend.
 */

export function RecordCard({ record, elo, action }: { record: MeRecord; elo: number; action?: ReactNode }) {
  const m = useMessages().profile.record;
  const { played, won, lost, ongoing } = record;
  const rate = winRate(record);
  return (
    <Card title={m.title} action={action}>
      <StatGrid>
        <Stat value={played} label={m.played} />
        <Stat value={won} label={m.won} />
        <Stat value={lost} label={m.lost} />
        <Stat value={ongoing} label={m.ongoing} />
        <Stat value={rate === null ? "—" : `${rate} %`} label={m.rate} />
        <Stat value={elo} label={m.elo} />
      </StatGrid>
    </Card>
  );
}

export function MyResult({ match }: { match: Pick<MeMatchSummary, "result" | "outcome" | "seat"> }) {
  const m = useMessages().profile.results;
  if (match.result === "ongoing") return <Badge tone="dim">{m.ongoing}</Badge>;
  // La couleur du camp vainqueur : c'est une information de partie.
  const winner = match.outcome?.winner;
  return <Badge tone={winner ?? "plain"}>{describeMyResult(match)}</Badge>;
}

export interface MatchTableProps {
  matches: readonly MeMatchSummary[];
  /** Le fragment du replay d'une partie. */
  replayHref: (match: MeMatchSummary) => string;
  /** Ajouter l'adversaire en ami ; absent, la colonne ne le propose pas. */
  onAddFriend?: ((match: MeMatchSummary) => void) | undefined;
  readOnly?: boolean | undefined;
}

export function MatchTable({ matches, replayHref, onAddFriend, readOnly = false }: MatchTableProps) {
  const all = useMessages();
  const t = all.profile.matches;
  const c = t.columns;
  return (
    <Table columns={[c.start, c.opponent, c.side, c.result, c.elo, c.moves, ""]} rowCount={matches.length} empty={t.empty}>
      {matches.map((m) => (
        <tr key={m.id}>
          <td className="occ-muted">{formatDate(m.startedAt)}</td>
          <td>{m.opponent}</td>
          <td>
            <Badge tone={m.seat}>{m.seat}</Badge>
          </td>
          <td>
            <MyResult match={m} />
          </td>
          <td className="occ-muted">{m.ratingChange !== null ? t.ratingChange(m.ratingChange) : m.rated ? "—" : t.unrated}</td>
          <td className="occ-muted">{m.actions}</td>
          <td className="occ-actions-cell">
            <QuickBar>
              {onAddFriend !== undefined && (
                <IconButton
                  icon="userPlus"
                  label={all.social.addOpponent(m.opponent)}
                  tipAlign="end"
                  disabledReason={readOnly ? all.social.readOnly : undefined}
                  onClick={() => onAddFriend(m)}
                />
              )}
              <IconButton
                icon="eye"
                label={m.result === "ongoing" ? t.ongoingReplay : t.replay}
                tipAlign="end"
                disabled={m.result === "ongoing"}
                onClick={() => (location.hash = replayHref(m))}
              />
            </QuickBar>
          </td>
        </tr>
      ))}
    </Table>
  );
}

export interface MatchReplayViewProps {
  match: MeMatchDetail;
  back: { href: string; label: string };
  /** Le pseudo de l'ami dont c'est le camp ; absent, c'est le sien. */
  friend?: string | undefined;
}

export function MatchReplayView({ match: m, back, friend }: MatchReplayViewProps) {
  const all = useMessages();
  const t = all.profile.matches;
  const title = friend === undefined ? t.against(m.opponent) : all.social.friend.against(friend, m.opponent);
  return (
    <>
      <BackLink href={back.href}>{back.label}</BackLink>
      <Hero title={title} badges={<MyResult match={m} />} meta={[t.side(m.seat), formatDate(m.startedAt)]} />
      <FactStrip
        facts={[
          { label: t.facts.start, value: formatDate(m.startedAt) },
          { label: t.facts.end, value: formatDate(m.finishedAt) },
          { label: t.facts.rules, value: m.rulesetVersion },
          { label: t.facts.map, value: m.scenario },
          { label: t.facts.moves, value: String(m.log.length) },
        ]}
      />
      {m.replayError !== null && <Banner>{t.replayError(m.replayError)}</Banner>}
      <Replay match={m} friend={friend} />
    </>
  );
}

/**
 * Le plateau rejoué **du point de vue d'un camp** : ses pièces, les pièces adverses qu'il
 * voyait, et rien d'autre. Les coups adverses ne sont pas détaillés, leur position
 * restant inconnue de ce camp.
 */
function Replay({ match: m, friend }: { match: MeMatchDetail; friend: string | undefined }) {
  const all = useMessages();
  const t = all.profile;
  const count = m.frames.length;
  const [index, setIndex] = useState(count - 1);
  const [turns, setTurns] = useState(0);
  const frames = useMemo(() => asBoardFrames(m.frames, m.seat), [m.frames, m.seat]);
  const board = useMemo(() => {
    try {
      return boardForScenario(m.scenario);
    } catch {
      return undefined;
    }
  }, [m.scenario]);

  const go = (next: number) => setIndex(clampFrame(next, count));
  const entry = index === 0 ? undefined : m.log[index - 1];
  const self = friend ?? t.replay.you;
  const label =
    index === 0
      ? t.replay.start
      : t.replay.move(index, m.log.length, entry?.player === m.seat ? self : m.opponent, entry?.action?.kind === "resign");

  if (board === undefined) {
    return <EmptyState>{t.replay.unknownMap(m.scenario)}</EmptyState>;
  }
  const c = t.replayControls;
  return (
    <Card title={friend === undefined ? t.replay.title : all.social.friend.replayTitle(friend)} flush>
      <Toolbar>
        <QuickBar>
          <IconButton icon="first" label={c.first} onClick={() => go(0)} />
          <IconButton icon="previous" label={c.previous} onClick={() => go(index - 1)} />
          <IconButton icon="next" label={c.next} onClick={() => go(index + 1)} />
          <IconButton icon="last" label={c.last} onClick={() => go(count - 1)} />
        </QuickBar>
        <ToolbarText>{label}</ToolbarText>
        <QuickBar>
          <IconButton icon="rotateLeft" label={c.rotate} onClick={() => setTurns(turns - 1)} />
          <IconButton icon="rotateRight" label={c.rotate} onClick={() => setTurns(turns + 1)} />
        </QuickBar>
      </Toolbar>
      <ReplayBoard board={board} frames={frames} index={index} perspective={m.seat} turns={turns} />
    </Card>
  );
}
