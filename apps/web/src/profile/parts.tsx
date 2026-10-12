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

export function RecordCard({ record, action }: { record: MeRecord; action?: ReactNode }) {
  const { played, won, lost, ongoing } = record;
  const rate = winRate(record);
  return (
    <Card title="Bilan" action={action}>
      <StatGrid>
        <Stat value={played} label="parties" />
        <Stat value={won} label="victoires" />
        <Stat value={lost} label="défaites" />
        <Stat value={ongoing} label="en cours" />
        <Stat value={rate === null ? "—" : `${rate} %`} label="taux" />
      </StatGrid>
    </Card>
  );
}

export function MyResult({ match }: { match: Pick<MeMatchSummary, "result" | "outcome" | "seat"> }) {
  if (match.result === "ongoing") return <Badge tone="dim">en cours</Badge>;
  // La couleur du camp vainqueur : c'est une information de partie.
  const winner = match.outcome?.winner;
  return <Badge tone={winner ?? "plain"}>{describeMyResult(match)}</Badge>;
}

export interface MatchTableProps {
  matches: readonly MeMatchSummary[];
  /** Le fragment du replay d'une partie. */
  replayHref: (match: MeMatchSummary) => string;
  /** Ajouter l'adversaire en ami ; absent, la colonne ne propose rien. */
  onAddFriend?: ((match: MeMatchSummary) => void) | undefined;
  readOnly?: boolean | undefined;
}

export function MatchTable({ matches, replayHref, onAddFriend, readOnly = false }: MatchTableProps) {
  return (
    <Table columns={["début", "adversaire", "camp", "résultat", "coups", ""]} rowCount={matches.length} empty="Aucune partie pour l'instant.">
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
          <td className="occ-muted">{m.actions}</td>
          <td className="occ-actions-cell">
            <QuickBar>
              {onAddFriend !== undefined && (
                <IconButton
                  icon="userPlus"
                  label={`Demander ${m.opponent} en ami`}
                  tipAlign="end"
                  disabledReason={readOnly ? "Session d'emprunt : lecture seule" : undefined}
                  onClick={() => onAddFriend(m)}
                />
              )}
              <IconButton
                icon="eye"
                label={m.result === "ongoing" ? "Partie en cours : le replay s'ouvre à la fin" : "Revoir la partie"}
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
  /** Le camp rejoué : « vous », ou le pseudo de l'ami. */
  self: string;
  /** Le titre de la vue ; « contre <adversaire> » par défaut. */
  title?: string | undefined;
}

export function MatchReplayView({ match: m, back, self, title }: MatchReplayViewProps) {
  return (
    <>
      <BackLink href={back.href}>{back.label}</BackLink>
      <Hero title={title ?? `contre ${m.opponent}`} badges={<MyResult match={m} />} meta={[`camp ${m.seat}`, formatDate(m.startedAt)]} />
      <FactStrip
        facts={[
          { label: "début", value: formatDate(m.startedAt) },
          { label: "fin", value: formatDate(m.finishedAt) },
          { label: "règles", value: m.rulesetVersion },
          { label: "carte", value: m.scenario },
          { label: "coups", value: String(m.log.length) },
        ]}
      />
      {m.replayError !== null && <Banner>Rejeu interrompu — {m.replayError}</Banner>}
      <Replay match={m} self={self} />
    </>
  );
}

/**
 * Le plateau rejoué **du point de vue d'un camp** : ses pièces, les pièces adverses qu'il
 * voyait, et rien d'autre. Les coups adverses ne sont pas détaillés, leur position
 * restant inconnue de ce camp.
 */
function Replay({ match: m, self }: { match: MeMatchDetail; self: string }) {
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
  const label =
    index === 0
      ? "position de départ"
      : `coup ${index} / ${m.log.length} — ${entry?.player === m.seat ? self : m.opponent}${entry?.action?.kind === "resign" ? " — abandon" : ""}`;

  if (board === undefined) {
    return <EmptyState>Carte « {m.scenario} » inconnue de ce client : le plateau ne peut pas être redessiné.</EmptyState>;
  }
  return (
    <Card title={self === "vous" ? "Replay — votre point de vue" : `Replay — point de vue de ${self}`} flush>
      <Toolbar>
        <QuickBar>
          <IconButton icon="first" label="Position de départ" onClick={() => go(0)} />
          <IconButton icon="previous" label="Coup précédent" onClick={() => go(index - 1)} />
          <IconButton icon="next" label="Coup suivant" onClick={() => go(index + 1)} />
          <IconButton icon="last" label="Dernière position" onClick={() => go(count - 1)} />
        </QuickBar>
        <ToolbarText>{label}</ToolbarText>
        <QuickBar>
          <IconButton icon="rotateLeft" label="Tourner d'un quart" onClick={() => setTurns(turns - 1)} />
          <IconButton icon="rotateRight" label="Tourner d'un quart" onClick={() => setTurns(turns + 1)} />
        </QuickBar>
      </Toolbar>
      <ReplayBoard board={board} frames={frames} index={index} perspective={m.seat} turns={turns} />
    </Card>
  );
}
