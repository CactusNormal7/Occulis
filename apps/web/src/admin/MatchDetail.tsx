import { useEffect, useMemo, useState } from "react";
import { BackLink, Banner, Card, EmptyState, FactStrip, IconButton, MoveList, QuickBar, Segmented, Toolbar, ToolbarText, Versus, useMessages, type MoveEntry } from "@occulis/ui";
import type { AdminMatchDetail } from "@occulis/protocol";
import { boardForScenario } from "../game/scenario.js";
import * as api from "./api.js";
import { useLoad } from "./hooks.js";
import { formatDate, routeHash } from "./model.js";
import { ReplayBoard } from "./ReplayBoard.js";
import { clampFrame, describeEntry, frameLabel, type Perspective } from "./replay.js";
import { ResultBadge, whenReady } from "./shared.js";

export function MatchDetail({ id }: { id: string }) {
  const t = useMessages().admin.match;
  const { loaded } = useLoad(`match:${id}`, () => api.match(id));
  return whenReady(loaded, (m) => (
    <>
      <BackLink href={routeHash({ view: "matches", status: null, offset: 0 })}>{t.back}</BackLink>
      <Versus
        a={{ name: m.playerA.handle, href: routeHash({ view: "player", id: m.playerA.id }) }}
        b={{ name: m.playerB.handle, href: routeHash({ view: "player", id: m.playerB.id }) }}
        end={<ResultBadge match={m} />}
      />
      <FactStrip
        facts={[
          { label: t.facts.start, value: formatDate(m.startedAt) },
          { label: t.facts.end, value: formatDate(m.finishedAt) },
          { label: t.facts.rules, value: m.rulesetVersion },
          { label: t.facts.map, value: m.scenario },
          { label: t.facts.moves, value: String(m.log.length) },
          { label: t.facts.id, value: <code>{m.id}</code> },
        ]}
      />
      {m.replayError !== null && <Banner>{t.replayError(m.replayError)}</Banner>}
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
  const t = useMessages().admin.match;
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
    { number: "—", text: t.start },
    ...m.log.map((logged) => ({
      number: String(logged.seq + 1),
      ...(logged.player !== null ? { seat: logged.player } : {}),
      text: describeEntry(m, logged.seq),
      disabled: logged.seq + 1 >= count,
    })),
  ];

  return (
    <Card title={t.moves(m.log.length)} action={<span className="occ-muted">{t.hint}</span>} flush>
      <MoveList
        entries={entries}
        shown={shown}
        pinned={pinned}
        onPreview={setShown}
        onPick={go}
        onLeave={() => setShown(pinned)}
      />
      {board === undefined ? (
        <EmptyState>{t.unknownMap(m.scenario)}</EmptyState>
      ) : (
        <div>
          <Toolbar>
            <QuickBar>
              <IconButton icon="first" label={t.first} onClick={() => go(0)} />
              <IconButton icon="previous" label={t.previous} onClick={() => go(pinned - 1)} />
              <IconButton
                icon={playing ? "pause" : "play"}
                label={playing ? t.pause : t.play}
                onClick={() => {
                  if (!playing && pinned >= count - 1) pin(0);
                  setPlaying(!playing);
                }}
              />
              <IconButton icon="next" label={t.next} onClick={() => go(pinned + 1)} />
              <IconButton icon="last" label={t.last} onClick={() => go(count - 1)} />
            </QuickBar>
            <ToolbarText>{frameLabel(m, shown)}</ToolbarText>
            <Segmented<Perspective>
              label={t.perspective}
              value={perspective}
              onChange={setPerspective}
              options={[
                { value: "all", label: t.everything },
                { value: "A", label: t.viewOf(m.playerA.handle), camp: "A" },
                { value: "B", label: t.viewOf(m.playerB.handle), camp: "B" },
              ]}
            />
            <QuickBar>
              <IconButton icon="rotateLeft" label={t.rotate} onClick={() => setTurns(turns - 1)} />
              <IconButton icon="rotateRight" label={t.rotate} onClick={() => setTurns(turns + 1)} />
            </QuickBar>
          </Toolbar>
          <ReplayBoard board={board} frames={m.frames} index={shown} perspective={perspective} turns={turns} />
        </div>
      )}
    </Card>
  );
}
