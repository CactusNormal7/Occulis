import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@occulis/i18n";
import { type PlayerId, type TeamEntry, rulesetFor } from "@occulis/core";
import type { TeamPreset } from "@occulis/protocol";
import {
  Badge,
  Button,
  CountdownRing,
  FormMessage,
  PageHead,
  Reveal,
  SelectField,
  UiRoot,
  useMessages,
} from "@occulis/ui";
import type { DeploymentState } from "../net/session.js";
import { boardForScenario } from "../game/scenario.js";
import { TeamBuilder } from "../team/TeamBuilder.js";
import { type TeamDraft, fromEntries, toEntries, verdict } from "../team/model.js";
import { useRemaining } from "./clock.js";
import { DEPLOYMENT_TOTAL_MS } from "./constants.js";
import { CardPlate } from "./Plates.js";
import { initialTeam, presetTeam, secondsLeft, shouldAutoSend, usablePresets } from "./model.js";

/**
 * L'écran de déploiement : l'annonce de l'adversaire, puis la composition et le placement
 * de l'équipe, avant l'échéance. L'annonce entre en scène puis se range en bandeau au
 * bout de quelques secondes ; le constructeur d'équipe est dessous dès le départ, le
 * temps courant déjà.
 *
 * Le serveur ne dit rien du placement adverse — seulement s'il est verrouillé.
 */
export interface DeploymentProps {
  readonly locale: Locale;
  readonly player: PlayerId;
  readonly scenario: string;
  readonly rulesetVersion: string;
  readonly deployment: DeploymentState;
  /** L'instant d'arrivée de l'annonce, sur `performance.now()`. */
  readonly receivedAt: number;
  readonly presets: readonly TeamPreset[];
  /** Le dernier refus du serveur, déjà mis en mots. */
  readonly rejection: string | undefined;
  readonly onDeploy: (team: readonly TeamEntry[]) => void;
}

/** Combien de temps l'annonce occupe l'écran avant de se ranger en bandeau. */
const REVEAL_MS = 2600;

export function Deployment(props: DeploymentProps) {
  return (
    <UiRoot locale={props.locale} fullPage>
      <main className="occ-page">
        <Content {...props} />
      </main>
    </UiRoot>
  );
}

function Content({ player, scenario, rulesetVersion, deployment, receivedAt, presets, rejection, onDeploy }: DeploymentProps) {
  const all = useMessages();
  const m = all.prepare;
  const ruleset = useMemo(() => rulesetFor(rulesetVersion), [rulesetVersion]);
  const board = useMemo(() => boardForScenario(scenario), [scenario]);
  const usable = usablePresets(presets, scenario, rulesetVersion);
  const [draft, setDraft] = useState<TeamDraft>(() =>
    fromEntries(ruleset, initialTeam(presets, scenario, rulesetVersion, player, deployment.defaultTeam)),
  );
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [compact, setCompact] = useState(false);
  const remaining = useRemaining(deployment.remainingMs, receivedAt);
  const locked = deployment.locks.self;
  const valid = verdict(ruleset, deployment.zone, draft).ok;

  // Les presets arrivent parfois après l'annonce : tant que le joueur n'a touché à rien,
  // celui par défaut remplace l'équipe de la carte.
  useEffect(() => {
    if (!touched) setDraft(fromEntries(ruleset, initialTeam(presets, scenario, rulesetVersion, player, deployment.defaultTeam)));
  }, [presets]);

  const edit = (next: TeamDraft): void => {
    setTouched(true);
    setDraft(next);
  };

  useEffect(() => {
    const timer = setTimeout(() => setCompact(true), REVEAL_MS);
    return () => clearTimeout(timer);
  }, []);

  // Un refus rend la main : on peut corriger et renvoyer.
  useEffect(() => {
    if (rejection !== undefined) setSent(false);
  }, [rejection]);

  const send = (): void => {
    setSent(true);
    onDeploy(toEntries(draft));
  };

  useEffect(() => {
    if (shouldAutoSend(remaining, valid, locked, sent)) send();
  });

  const opponent: PlayerId = player === "A" ? "B" : "A";
  return (
    <div className="occ-stack">
      <Reveal
        compact={compact}
        versus={m.reveal.versus}
        self={<CardPlate card={deployment.self} camp={player} self align="start" />}
        opponent={<CardPlate card={deployment.opponent} camp={opponent} self={false} align="end" />}
        footer={<Badge tone="strong">{deployment.rated ? m.reveal.rated : m.reveal.unrated}</Badge>}
      />
      <PageHead
        title={m.deploy.title}
        tools={
          <>
            {usable.length > 0 && !locked && (
              <SelectField
                label={m.deploy.preset}
                value=""
                onChange={(event) => {
                  const chosen = usable.find((preset) => preset.id === event.target.value);
                  if (chosen !== undefined) edit(fromEntries(ruleset, presetTeam(chosen, player)));
                }}
                options={[{ value: "", label: m.deploy.noPreset }, ...usable.map((preset) => ({ value: preset.id, label: preset.name }))]}
              />
            )}
            <CountdownRing totalMs={DEPLOYMENT_TOTAL_MS} remainingMs={remaining} label={m.remaining}>
              {secondsLeft(remaining)}
            </CountdownRing>
            <Button variant="primary" icon={locked ? undefined : "shield"} disabled={locked || sent || !valid} onClick={send}>
              {locked ? m.deploy.locked : m.deploy.lock}
            </Button>
          </>
        }
      />
      <FormMessage tone="info">
        {locked
          ? deployment.locks.opponent
            ? m.deploy.opponentLocked
            : m.deploy.waitingOpponent
          : `${m.deploy.lead} ${deployment.locks.opponent ? m.deploy.opponentLocked : m.deploy.opponentPending}`}
      </FormMessage>
      {rejection !== undefined && !locked && <FormMessage tone="error">{rejection}</FormMessage>}
      <TeamBuilder
        ruleset={ruleset}
        board={board}
        side={player}
        zone={deployment.zone}
        opponentZone={deployment.opponentZone}
        draft={draft}
        onChange={edit}
        defaultTeam={deployment.defaultTeam}
        locked={locked || sent}
      />
      {!locked && <small className="occ-muted">{m.deploy.timeoutNote}</small>}
    </div>
  );
}
