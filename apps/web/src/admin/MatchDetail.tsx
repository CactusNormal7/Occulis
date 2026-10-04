import { useEffect, useMemo, useState } from "react";
import { BackLink, Banner, Card, EmptyState, FactStrip, IconButton, MoveList, QuickBar, Segmented, Toolbar, ToolbarText, Versus, type MoveEntry } from "@occulis/ui";
import type { AdminMatchDetail } from "@occulis/protocol";
import { boardForScenario } from "../game/scenario.js";
import * as api from "./api.js";
import { useLoad } from "./hooks.js";
import { formatDate, routeHash } from "./model.js";
import { ReplayBoard } from "./ReplayBoard.js";
import { clampFrame, describeEntry, frameLabel, type Perspective } from "./replay.js";
import { ResultBadge, whenReady } from "./shared.js";

export function MatchDetail({ id }: { id: string }) {
  const { loaded } = useLoad(`match:${id}`, () => api.match(id));
  return whenReady(loaded, (m) => (
    <>
      <BackLink href={routeHash({ view: "matches", status: null, offset: 0 })}>Parties</BackLink>
      <Versus
        a={{ name: m.playerA.handle, href: routeHash({ view: "player", id: m.playerA.id }) }}
        b={{ name: m.playerB.handle, href: routeHash({ view: "player", id: m.playerB.id }) }}
        end={<ResultBadge match={m} />}
      />
      <FactStrip
        facts={[
          { label: "début", value: formatDate(m.startedAt) },
          { label: "fin", value: formatDate(m.finishedAt) },
          { label: "règles", value: m.rulesetVersion },
          { label: "carte", value: m.scenario },
          { label: "coups", value: String(m.log.length) },
          { label: "identifiant", value: <code>{m.id}</code> },
        ]}
      />
      {m.replayError !== null && <Banner>Rejeu interrompu — {m.replayError}</Banner>}
      <Replay match={m} />
    </>
  ));
}

/**
 * La liste des coups, et sous elle le plateau à l'image choisie. Survoler un coup le
 * montre ; cliquer l'épingle, et le plateau y revient quand la souris quitte la liste.
 * Les flèches du clavier parcourent la partie, la lecture la déroule.
 */
function Replay({ match: m }: { match: AdminMatchDetail }) {
  const count = m.frames.length;
  const [pinned, setPinned] = useState(count - 1);
  const [shown, setShown] = useState(count - 1);
  const [playing, setPlaying] = useState(false);
  const [perspective, setPerspective] = useState<Perspective>("all");
  const [turns, setTurns] = useState(0);

  const board = useMemo(() => {
    try {
      return boardForScenario(m.scenario);
    } catch {
      // Une carte retirée du registre : le log reste lisible, le plateau ne l'est plus.
      return undefined;
    }
  }, [m.scenario]);

  const pin = (index: number) => {
    const next = clampFrame(index, count);
    setPinned(next);
    setShown(next);
  };
  const go = (index: number) => {
    setPlaying(false);
    pin(index);
  };

  useEffect(() => {
    if (!playing) return;
    if (pinned >= count - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => pin(pinned + 1), 900);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") go(pinned - 1);
      else if (event.key === "ArrowRight") go(pinned + 1);
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const entries: MoveEntry[] = [
    { number: "—", text: "départ" },
    ...m.log.map((logged) => ({
      number: String(logged.seq + 1),
      ...(logged.player !== null ? { seat: logged.player } : {}),
      text: describeEntry(m, logged.seq),
      disabled: logged.seq + 1 >= count,
    })),
  ];

  return (
    <Card title={`Coups (${m.log.length})`} action={<span className="occ-muted">survoler pour voir · cliquer pour épingler</span>} flush>
      <MoveList
        entries={entries}
        shown={shown}
        pinned={pinned}
        onPreview={setShown}
        onPick={go}
        onLeave={() => setShown(pinned)}
      />
      {board === undefined ? (
        <EmptyState>Carte « {m.scenario} » inconnue de ce client : le plateau ne peut pas être redessiné.</EmptyState>
      ) : (
        <div>
          <Toolbar>
            <QuickBar>
              <IconButton icon="first" label="Position de départ" onClick={() => go(0)} />
              <IconButton icon="previous" label="Coup précédent (←)" onClick={() => go(pinned - 1)} />
              <IconButton
                icon={playing ? "pause" : "play"}
                label={playing ? "Mettre en pause" : "Lire la partie"}
                onClick={() => {
                  if (!playing && pinned >= count - 1) pin(0);
                  setPlaying(!playing);
                }}
              />
              <IconButton icon="next" label="Coup suivant (→)" onClick={() => go(pinned + 1)} />
              <IconButton icon="last" label="Dernière position" onClick={() => go(count - 1)} />
            </QuickBar>
            <ToolbarText>{frameLabel(m, shown)}</ToolbarText>
            <Segmented<Perspective>
              label="Point de vue"
              value={perspective}
              onChange={setPerspective}
              options={[
                { value: "all", label: "tout" },
                { value: "A", label: `vue de ${m.playerA.handle}`, camp: "A" },
                { value: "B", label: `vue de ${m.playerB.handle}`, camp: "B" },
              ]}
            />
            <QuickBar>
              <IconButton icon="rotateLeft" label="Tourner d'un quart" onClick={() => setTurns(turns - 1)} />
              <IconButton icon="rotateRight" label="Tourner d'un quart" onClick={() => setTurns(turns + 1)} />
            </QuickBar>
          </Toolbar>
          <ReplayBoard board={board} frames={m.frames} index={shown} perspective={perspective} turns={turns} />
        </div>
      )}
    </Card>
  );
}
