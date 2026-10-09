import { useEffect, useRef } from "react";
import type { Board, Coord, PlayerId, Ruleset, TeamEntry } from "@occulis/core";
import {
  Badge,
  Button,
  Card,
  CardColumn,
  CardGrid,
  ChoiceList,
  ChoiceRow,
  FormMessage,
  IconButton,
  QuickBar,
  SelectField,
  Toolbar,
  ToolbarText,
  useMessages,
} from "@occulis/ui";
import { describeTeamError } from "../ui/messages.js";
import { type PlacementCanvas, mountPlacement } from "./placement-canvas.js";
import { type TeamDraft, autoFill, clear, clickTile, fromEntries, placedCount, remove, select, setKind, verdict } from "./model.js";

/**
 * Le constructeur d'équipe : les emplacements de la composition à gauche, le plateau et
 * la zone à droite. Il sert au déploiement (`deployment/`) comme à la préparation hors
 * partie (`teams/`) — l'état vit chez l'appelant (`draft`, `onChange`), ce composant ne
 * fait que le montrer et le modifier par `team/model.ts`.
 */
export interface TeamBuilderProps {
  readonly ruleset: Ruleset;
  readonly board: Board;
  readonly side: PlayerId;
  readonly zone: readonly Coord[];
  readonly opponentZone: readonly Coord[];
  readonly draft: TeamDraft;
  readonly onChange: (draft: TeamDraft) => void;
  /** L'équipe que propose la carte, pour repartir d'elle. */
  readonly defaultTeam?: readonly TeamEntry[] | undefined;
  /** Verrouillée : on regarde, on ne touche plus. */
  readonly locked?: boolean | undefined;
}

export function TeamBuilder({ ruleset, board, side, zone, opponentZone, draft, onChange, defaultTeam, locked = false }: TeamBuilderProps) {
  const m = useMessages().team;
  const check = verdict(ruleset, zone, draft);
  const change = (next: TeamDraft): void => {
    if (!locked) onChange(next);
  };
  const kindName = (kind: string): string => m.kinds[kind] ?? m.unknownKind(kind);

  return (
    <CardGrid>
      <CardColumn>
        <Card title={m.progress(placedCount(draft), draft.slots.length)}>
          <ChoiceList label={m.board.label}>
            {draft.slots.map((slot, index) => {
              const type = ruleset.get(slot.kind);
              const choices = ruleset.kindsOf(slot.role);
              return (
                <ChoiceRow
                  key={index}
                  camp={side}
                  selected={!locked && draft.selected === index}
                  muted={slot.coord === undefined}
                  onSelect={locked ? undefined : () => change(select(draft, index))}
                  end={
                    <>
                      {choices.length > 1 && !locked && (
                        <SelectField
                          label={m.slot.choose}
                          value={slot.kind}
                          onChange={(event) => change(setKind(draft, ruleset, index, event.target.value))}
                          options={choices.map((kind) => ({ value: kind, label: kindName(kind) }))}
                        />
                      )}
                      {slot.coord === undefined ? (
                        <Badge tone="dim">{m.slot.empty}</Badge>
                      ) : (
                        <Badge tone={side}>{m.slot.placed(slot.coord.x, slot.coord.y)}</Badge>
                      )}
                      {slot.coord !== undefined && !locked && (
                        <IconButton icon="close" label={m.actions.reset} tipAlign="end" onClick={() => change(remove(draft, index))} />
                      )}
                    </>
                  }
                >
                  <strong>
                    {m.roles[slot.role]} · {kindName(slot.kind)}
                  </strong>
                  <small>
                    {m.stats(type.movement.steps, type.vision.range)}
                    {type.movement.canClimb ? ` · ${m.climbs}` : ""}
                  </small>
                </ChoiceRow>
              );
            })}
          </ChoiceList>
        </Card>
        {!check.ok && placedCount(draft) === draft.slots.length && <FormMessage tone="error">{describeTeamError(check.error)}</FormMessage>}
      </CardColumn>
      <CardColumn>
        <Card flush>
          <PlacementBoard
            board={board}
            side={side}
            zone={zone}
            opponentZone={opponentZone}
            draft={draft}
            initialOf={(kind) => kindName(kind).slice(0, 1).toUpperCase()}
            onPick={(coord) => change(clickTile(draft, coord, zone))}
          />
          {!locked && (
            <Toolbar>
              <ToolbarText>{m.board.hint}</ToolbarText>
              <QuickBar>
                <Button size="sm" onClick={() => change(autoFill(draft, zone))}>
                  {m.actions.autoFill}
                </Button>
                {defaultTeam !== undefined && (
                  <Button size="sm" onClick={() => change(fromEntries(ruleset, defaultTeam))}>
                    {m.actions.defaults}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => change(clear(draft))}>
                  {m.actions.reset}
                </Button>
              </QuickBar>
            </Toolbar>
          )}
        </Card>
      </CardColumn>
    </CardGrid>
  );
}

interface PlacementBoardProps {
  readonly board: Board;
  readonly side: PlayerId;
  readonly zone: readonly Coord[];
  readonly opponentZone: readonly Coord[];
  readonly draft: TeamDraft;
  readonly initialOf: (kind: string) => string;
  readonly onPick: (coord: Coord) => void;
}

/**
 * Le canevas du placement, monté une fois par plateau. Les clics remontent par une
 * référence, pour qu'un nouveau rendu n'oblige pas à remonter le canevas.
 */
function PlacementBoard({ board, side, zone, opponentZone, draft, initialOf, onPick }: PlacementBoardProps) {
  const m = useMessages().team;
  const canvas = useRef<HTMLCanvasElement>(null);
  const mounted = useRef<PlacementCanvas | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (canvas.current === null) return;
    const placement = mountPlacement(canvas.current, board, side, (coord) => pick.current(coord));
    mounted.current = placement;
    return () => {
      placement.destroy();
      mounted.current = null;
    };
  }, [board, side]);

  useEffect(() => {
    mounted.current?.update({
      side,
      zone,
      opponentZone,
      initialOf,
      pieces: draft.slots.flatMap((slot, index) =>
        slot.coord === undefined ? [] : [{ coord: slot.coord, kind: slot.kind, selected: draft.selected === index }],
      ),
    });
  });

  return (
    <>
      <canvas ref={canvas} aria-label={m.board.label} style={{ display: "block", width: "100%", height: "clamp(300px, 52vh, 520px)" }} />
      <Toolbar>
        <QuickBar>
          <IconButton icon="rotateLeft" label={m.board.rotate} onClick={() => mounted.current?.rotate(-1)} />
          <IconButton icon="rotateRight" label={m.board.rotate} onClick={() => mounted.current?.rotate(1)} />
        </QuickBar>
      </Toolbar>
    </>
  );
}
