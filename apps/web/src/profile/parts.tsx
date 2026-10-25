import { useMemo, useState, type ReactNode } from "react";
import { Board } from "@occulis/core";
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
import type { MeMatchDetail, MeMatchSummary, MeRecord, Relation } from "@occulis/protocol";
import { ReplayBoard } from "../replay/ReplayBoard.js";
import { clampFrame } from "../replay/replay.js";
import { formatDate, winRate } from "../admin/model.js";
import { asBoardFrames, describeMyResult } from "./model.js";

/**
 * Les briques communes à ses propres parties et à celles d'un ami : un bilan, une table
 * d'historique, un replay. Elles montrent toujours **un** camp — le sien, ou celui de
 * l'ami — car c'est tout ce que le serveur rend.
 */

export function RecordCard({
  record,
  elo,
  action,
}: {
  record: MeRecord;
  elo: number;
  action?: ReactNode;
}) {
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

export function MyResult({
  match,
}: {
  match: Pick<MeMatchSummary, "result" | "outcome" | "seat">;
}) {
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
  /**
   * Ce qu'est déjà l'adversaire : un ami ou un joueur bloqué ne se propose plus, une
   * demande envoyée se grise. Inconnue (liste pas encore lue), le geste reste offert —
   * le serveur tranche de toute façon.
   */
  relationOf?: ((match: MeMatchSummary) => Relation | undefined) | undefined;
  readOnly?: boolean | undefined;
}

export function MatchTable({
  matches,
  replayHref,
  onAddFriend,
  relationOf,
  readOnly = false,
}: MatchTableProps) {
  const all = useMessages();
  const t = all.profile.matches;
  const c = t.columns;
  return (
    <Table
      columns={[c.start, c.opponent, c.side, c.result, c.elo, c.moves, ""]}
      rowCount={matches.length}
      empty={t.empty}
    >
      {matches.map((match) => {
        const relation = relationOf?.(match);
        const offerFriend =
          onAddFriend !== undefined && relation !== "friend" && relation !== "blocked";
        let ratingLabel = match.rated ? "—" : t.unrated;
        if (match.ratingChange !== null) ratingLabel = t.ratingChange(match.ratingChange);
        let friendDisabledReason: string | undefined;
        if (readOnly) friendDisabledReason = all.social.readOnly;
        else if (relation === "outgoing") {
          friendDisabledReason = all.social.requestPending(match.opponent);
        }
        return (
          <tr key={match.id}>
            <td className="occ-muted">{formatDate(match.startedAt)}</td>
            <td>{match.opponent}</td>
            <td>
              <Badge tone={match.seat}>{match.seat}</Badge>
            </td>
            <td>
              <MyResult match={match} />
            </td>
            <td className="occ-muted">{ratingLabel}</td>
            <td className="occ-muted">{match.actions}</td>
            <td className="occ-actions-cell">
              <QuickBar>
                {offerFriend && (
                  <IconButton
                    icon="userPlus"
                    label={all.social.addOpponent(match.opponent)}
                    tipAlign="end"
                    disabledReason={friendDisabledReason}
                    onClick={() => onAddFriend(match)}
                  />
                )}
                <IconButton
                  icon="eye"
                  label={match.result === "ongoing" ? t.ongoingReplay : t.replay}
                  tipAlign="end"
                  disabled={match.result === "ongoing"}
                  onClick={() => (location.hash = replayHref(match))}
                />
              </QuickBar>
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

export interface MatchReplayViewProps {
  match: MeMatchDetail;
  back: { href: string; label: string };
  /** Le pseudo de l'ami dont c'est le camp ; absent, c'est le sien. */
  friend?: string | undefined;
}

export function MatchReplayView({ match, back, friend }: MatchReplayViewProps) {
  const all = useMessages();
  const t = all.profile.matches;
  const title =
    friend === undefined
      ? t.against(match.opponent)
      : all.social.friend.against(friend, match.opponent);
  return (
    <>
      <BackLink href={back.href}>{back.label}</BackLink>
      <Hero
        title={title}
        badges={<MyResult match={match} />}
        meta={[t.side(match.seat), formatDate(match.startedAt)]}
      />
      <FactStrip
        facts={[
          { label: t.facts.start, value: formatDate(match.startedAt) },
          { label: t.facts.end, value: formatDate(match.finishedAt) },
          { label: t.facts.rules, value: match.rulesetVersion },
          { label: t.facts.map, value: match.scenario },
          { label: t.facts.moves, value: String(match.log.length) },
        ]}
      />
      {match.replayError !== null && (
        <Banner>{t.replayError(match.replayError.seq, match.replayError.code)}</Banner>
      )}
      <Replay match={match} friend={friend} />
    </>
  );
}

/**
 * Le plateau rejoué **du point de vue d'un camp** : ses pièces, les pièces adverses qu'il
 * voyait, et rien d'autre. Les coups adverses ne sont pas détaillés, leur position
 * restant inconnue de ce camp.
 */
function Replay({ match, friend }: { match: MeMatchDetail; friend: string | undefined }) {
  const all = useMessages();
  const t = all.profile;
  const count = match.frames.length;
  const [index, setIndex] = useState(count - 1);
  const [turns, setTurns] = useState(0);
  const frames = useMemo(() => asBoardFrames(match.frames, match.seat), [match.frames, match.seat]);
  // La carte que la partie a figée ; `null` quand le serveur n'a pas su la relire.
  const board = useMemo(
    () => (match.board === null ? undefined : new Board(match.board)),
    [match.board],
  );

  const go = (next: number) => setIndex(clampFrame(next, count));
  const entry = index === 0 ? undefined : match.log[index - 1];
  const self = friend ?? t.replay.you;
  const label =
    index === 0
      ? t.replay.start
      : t.replay.move(
          index,
          match.log.length,
          entry?.player === match.seat ? self : match.opponent,
          entry?.action?.kind === "resign",
        );

  if (board === undefined) {
    return <EmptyState>{t.replay.unknownMap(match.scenario)}</EmptyState>;
  }
  const c = t.replayControls;
  return (
    <Card
      title={friend === undefined ? t.replay.title : all.social.friend.replayTitle(friend)}
      flush
    >
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
      <ReplayBoard
        board={board}
        frames={frames}
        index={index}
        perspective={match.seat}
        turns={turns}
      />
    </Card>
  );
}
