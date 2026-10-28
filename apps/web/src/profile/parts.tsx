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
  MoveList,
  QuickBar,
  Segmented,
  Stat,
  StatGrid,
  Table,
  Toolbar,
  ToolbarText,
  useMessages,
  type MoveEntry,
} from "@occulis/ui";
import type { MeMatchDetail, MeMatchSummary, MeRecord, Relation } from "@occulis/protocol";
import { ReplayBoard } from "../replay/ReplayBoard.js";
import { clampFrame, describeEntry, type Perspective } from "../replay/replay.js";
import { formatDate, winRate } from "../admin/model.js";
import { describeMyResult } from "./model.js";

/**
 * Les briques communes à ses propres parties et à celles d'un ami : un bilan, une table
 * d'historique, un replay. Le replay révèle les deux camps : la partie est finie.
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
      centered={[2]}
      rowCount={matches.length}
      empty={t.empty}
    >
      {matches.map((m) => {
        const relation = relationOf?.(m);
        const offerFriend =
          onAddFriend !== undefined && relation !== "friend" && relation !== "blocked";
        return (
          <tr key={m.id}>
            <td className="occ-muted">{formatDate(m.startedAt)}</td>
            <td>{m.opponent}</td>
            <td className="occ-center">
              <span className={`occ-seat occ-seat--${m.seat}`}>{m.seat}</span>
            </td>
            <td>
              <MyResult match={m} />
            </td>
            <td className="occ-muted">
              {m.ratingChange !== null ? t.ratingChange(m.ratingChange) : m.rated ? "—" : t.unrated}
            </td>
            <td className="occ-muted">{m.actions}</td>
            <td className="occ-actions-cell">
              <QuickBar>
                {offerFriend && (
                  <IconButton
                    icon="userPlus"
                    label={all.social.addOpponent(m.opponent)}
                    tipAlign="end"
                    disabledReason={
                      readOnly
                        ? all.social.readOnly
                        : relation === "outgoing"
                          ? all.social.requestPending(m.opponent)
                          : undefined
                    }
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

export function MatchReplayView({ match: m, back, friend }: MatchReplayViewProps) {
  const all = useMessages();
  const t = all.profile.matches;
  const title =
    friend === undefined ? t.against(m.opponent) : all.social.friend.against(friend, m.opponent);
  return (
    <>
      <BackLink href={back.href}>{back.label}</BackLink>
      <Hero
        title={title}
        badges={<MyResult match={m} />}
        meta={[t.side(m.seat), formatDate(m.startedAt)]}
      />
      <FactStrip
        facts={[
          { label: t.facts.start, value: formatDate(m.startedAt) },
          { label: t.facts.end, value: formatDate(m.finishedAt) },
          { label: t.facts.rules, value: m.rulesetVersion },
          { label: t.facts.map, value: m.scenario },
          { label: t.facts.moves, value: String(m.log.length) },
        ]}
      />
      {m.replayError !== null && (
        <Banner>{t.replayError(m.replayError.seq, m.replayError.code)}</Banner>
      )}
      <Replay match={m} friend={friend} />
    </>
  );
}

/**
 * Le plateau rejoué d'une partie **finie**, donc révélée en entier : le point de vue d'un
 * camp, de l'autre, ou les deux ensemble, au départ celui qu'on tenait. Survoler un coup
 * de la liste le montre, cliquer l'épingle.
 */
export function Replay({
  match: m,
  friend,
}: {
  match: MeMatchDetail;
  friend?: string | undefined;
}) {
  const all = useMessages();
  const t = all.profile;
  const count = m.frames.length;
  const [pinned, setPinned] = useState(count - 1);
  const [shown, setShown] = useState(count - 1);
  const [turns, setTurns] = useState(0);
  const [perspective, setPerspective] = useState<Perspective>(m.seat);
  // La carte que la partie a figée ; `null` quand le serveur n'a pas su la relire.
  const board = useMemo(() => (m.board === null ? undefined : new Board(m.board)), [m.board]);

  const go = (next: number) => {
    const index = clampFrame(next, count);
    setPinned(index);
    setShown(index);
  };
  const self = friend ?? t.replay.you;
  const nameOf = (seat: "A" | "B" | null) => (seat === m.seat ? self : m.opponent);
  const label =
    shown === 0
      ? t.replay.start
      : t.replay.move(
          shown,
          m.log.length,
          nameOf(m.log[shown - 1]?.player ?? null),
          m.log[shown - 1]?.action.kind === "resign",
        );

  const entries: MoveEntry[] = [
    { number: "—", text: t.replay.start },
    ...m.log.map((logged) => ({
      number: String(logged.seq + 1),
      ...(logged.player !== null ? { seat: logged.player } : {}),
      text: describeEntry(m, logged.seq),
      disabled: logged.seq + 1 >= count,
    })),
  ];

  if (board === undefined) {
    return <EmptyState>{t.replay.unknownMap(m.scenario)}</EmptyState>;
  }
  const c = t.replayControls;
  const other = m.seat === "A" ? "B" : "A";
  return (
    <Card
      title={friend === undefined ? t.replay.title : all.social.friend.replayTitle(friend)}
      action={<span className="occ-muted">{t.replay.hint}</span>}
      flush
    >
      <MoveList
        entries={entries}
        shown={shown}
        pinned={pinned}
        onPreview={setShown}
        onPick={go}
        onLeave={() => setShown(pinned)}
      />
      <Toolbar>
        <QuickBar>
          <IconButton icon="first" label={c.first} onClick={() => go(0)} />
          <IconButton icon="previous" label={c.previous} onClick={() => go(pinned - 1)} />
          <IconButton icon="next" label={c.next} onClick={() => go(pinned + 1)} />
          <IconButton icon="last" label={c.last} onClick={() => go(count - 1)} />
        </QuickBar>
        <ToolbarText>{label}</ToolbarText>
        <Segmented<Perspective>
          label={t.replay.perspective}
          value={perspective}
          onChange={setPerspective}
          options={[
            { value: m.seat, label: t.replay.viewOf(self), camp: m.seat },
            { value: other, label: t.replay.viewOf(m.opponent), camp: other },
            { value: "all", label: t.replay.everything },
          ]}
        />
        <QuickBar>
          <IconButton icon="rotateLeft" label={c.rotate} onClick={() => setTurns(turns - 1)} />
          <IconButton icon="rotateRight" label={c.rotate} onClick={() => setTurns(turns + 1)} />
        </QuickBar>
      </Toolbar>
      <ReplayBoard
        board={board}
        frames={m.frames}
        index={shown}
        perspective={perspective}
        turns={turns}
      />
    </Card>
  );
}
