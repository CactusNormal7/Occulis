import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@occulis/i18n";
import { type TeamEntry, rulesetFor, scenarioFor } from "@occulis/core";
import type { TeamPreset, TeamPresetList } from "@occulis/protocol";
import {
  Badge,
  Button,
  Card,
  ChoiceList,
  ChoiceRow,
  Dialog,
  EmptyState,
  FormMessage,
  IconButton,
  Note,
  PageHead,
  QuickBar,
  TextField,
  ToastProvider,
  UiRoot,
  useMessages,
  useToast,
} from "@occulis/ui";
import * as api from "../profile/api.js";
import { boardForScenario } from "../game/scenario.js";
import { TeamBuilder } from "../team/TeamBuilder.js";
import { type TeamDraft, emptyDraft, fromEntries, toEntries, verdict } from "../team/model.js";

/**
 * Les équipes préparées, depuis le menu : la liste, et l'éditeur qui reprend le
 * constructeur du déploiement. Une équipe se prépare pour la carte et le ruleset des
 * nouvelles parties, dans la zone du camp A — elle sera transposée au camp réellement
 * tenu (`prepare/model.ts`, `presetTeam()`).
 */
export interface TeamsAppProps {
  readonly locale: Locale;
  readonly onBack: () => void;
}

export function TeamsApp({ locale, onBack }: TeamsAppProps) {
  return (
    <UiRoot locale={locale} fullPage>
      <ToastProvider>
        <main className="occ-page">
          <Teams onBack={onBack} />
        </main>
      </ToastProvider>
    </UiRoot>
  );
}

type Editing = { readonly id: string | undefined; readonly name: string; readonly team: readonly TeamEntry[] } | undefined;

function Teams({ onBack }: { onBack: () => void }) {
  const m = useMessages().team.presets;
  const notify = useToast();
  const [list, setList] = useState<TeamPresetList | undefined>(undefined);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<Editing>(undefined);
  const [deleting, setDeleting] = useState<TeamPreset | undefined>(undefined);

  const reload = (): void => {
    void api.presets().then((outcome) => {
      if (outcome.ok) setList(outcome.value);
      else setFailure(outcome.message);
    });
  };
  useEffect(reload, []);

  if (failure !== undefined) {
    return <EmptyState error action={<Button onClick={onBack}>{m.back}</Button>}>{failure}</EmptyState>;
  }
  if (list === undefined) return null;

  if (editing !== undefined) {
    return (
      <Editor
        list={list}
        editing={editing}
        onCancel={() => setEditing(undefined)}
        onSaved={() => {
          notify(m.saved, true);
          setEditing(undefined);
          reload();
        }}
      />
    );
  }

  const full = list.presets.length >= list.limit;
  return (
    <div className="occ-stack occ-enter">
      <PageHead
        title={m.title}
        count={list.presets.length}
        tools={
          <>
            <Button variant="ghost" onClick={onBack}>
              {m.back}
            </Button>
            <Button variant="primary" icon="plus" disabled={full} title={full ? m.limit(list.limit) : undefined} onClick={() => setEditing({ id: undefined, name: "", team: [] })}>
              {m.create}
            </Button>
          </>
        }
      />
      <Note>
        {m.lead} {m.limit(list.limit)}
      </Note>
      <Card>
        {list.presets.length === 0 ? (
          <EmptyState>{m.empty}</EmptyState>
        ) : (
          <ChoiceList label={m.title}>
            {list.presets.map((preset) => (
              <ChoiceRow
                key={preset.id}
                muted={!preset.valid}
                onSelect={() => setEditing({ id: preset.id, name: preset.name, team: preset.team })}
                end={
                  <QuickBar>
                    {preset.isDefault ? (
                      <Badge tone="strong">{m.default}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!preset.valid}
                        onClick={() =>
                          void api.setDefaultPreset(preset.id).then((outcome) => {
                            if (!outcome.ok) notify(outcome.message, false);
                            reload();
                          })
                        }
                      >
                        {m.makeDefault}
                      </Button>
                    )}
                    <IconButton
                      icon="copy"
                      label={m.duplicate}
                      disabledReason={full ? m.limit(list.limit) : undefined}
                      onClick={() => setEditing({ id: undefined, name: m.copyOf(preset.name), team: preset.team })}
                    />
                    <IconButton icon="trash" label={m.delete} danger tipAlign="end" onClick={() => setDeleting(preset)} />
                  </QuickBar>
                }
              >
                <strong>{preset.name}</strong>
                <small>
                  {m.map(preset.scenario)}
                  {!preset.valid && ` · ${m.invalid} — ${m.invalidHint}`}
                </small>
              </ChoiceRow>
            ))}
          </ChoiceList>
        )}
      </Card>
      {deleting !== undefined && (
        <Dialog
          open
          danger
          title={m.deleteTitle(deleting.name)}
          confirmLabel={m.delete}
          onClose={() => setDeleting(undefined)}
          onConfirm={async () => {
            const outcome = await api.deletePreset(deleting.id);
            notify(outcome.ok ? m.deleted : outcome.message, outcome.ok);
            if (outcome.ok) reload();
            return outcome.ok;
          }}
        >
          <Note>{m.deleteNote}</Note>
        </Dialog>
      )}
    </div>
  );
}

function Editor({
  list,
  editing,
  onCancel,
  onSaved,
}: {
  list: TeamPresetList;
  editing: NonNullable<Editing>;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const m = useMessages().team.presets;
  const ruleset = useMemo(() => rulesetFor(list.rulesetVersion), [list.rulesetVersion]);
  const board = useMemo(() => boardForScenario(list.scenario), [list.scenario]);
  const deployment = scenarioFor(list.scenario).deployment;
  const [name, setName] = useState(editing.name);
  const [draft, setDraft] = useState<TeamDraft>(() =>
    editing.team.length > 0 ? fromEntries(ruleset, editing.team) : emptyDraft(ruleset),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  if (deployment === undefined) return <EmptyState error>{m.errors["PRESET_TEAM"]}</EmptyState>;

  const zone = deployment.zones.A;
  const valid = verdict(ruleset, zone, draft).ok;
  const save = (): void => {
    if (!valid) {
      setError(m.incomplete);
      return;
    }
    setBusy(true);
    setError(undefined);
    const team = toEntries(draft);
    const pending = editing.id === undefined ? api.createPreset(name, team) : api.updatePreset(editing.id, { name, team });
    void pending.then((outcome) => {
      setBusy(false);
      if (outcome.ok) onSaved();
      else setError(outcome.message);
    });
  };

  return (
    <div className="occ-stack occ-enter">
      <PageHead
        title={editing.id === undefined ? m.create : m.edit}
        tools={
          <>
            <Button variant="ghost" onClick={onCancel}>
              {m.cancel}
            </Button>
            <Button variant="primary" disabled={busy} onClick={save}>
              {busy ? m.saving : m.save}
            </Button>
          </>
        }
      />
      <TextField label={m.name} placeholder={m.namePlaceholder} maxLength={32} value={name} onChange={(event) => setName(event.target.value)} />
      {error !== undefined && <FormMessage tone="error">{error}</FormMessage>}
      <TeamBuilder
        ruleset={ruleset}
        board={board}
        side="A"
        zone={zone}
        opponentZone={deployment.zones.B}
        draft={draft}
        onChange={setDraft}
        defaultTeam={deployment.defaultTeams.A}
      />
    </div>
  );
}
