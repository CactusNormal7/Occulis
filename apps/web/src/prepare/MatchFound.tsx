import { useEffect } from "react";
import type { Locale } from "@occulis/i18n";
import { CountdownRing, Dialog, Note, UiRoot, useMessages } from "@occulis/ui";
import { ACCEPT_TOTAL_MS } from "./constants.js";
import { useRemaining } from "./clock.js";
import { secondsLeft } from "./model.js";

/**
 * La fenêtre « partie trouvée » : accepter ou refuser, avant l'échéance. Elle ne se ferme
 * ni par Échap ni par la croix — la question attend une réponse explicite, et ne pas
 * répondre revient à refuser.
 */
export interface MatchFoundProps {
  readonly locale: Locale;
  readonly remainingMs: number;
  /** L'instant d'arrivée du message, sur `performance.now()`. */
  readonly receivedAt: number;
  readonly accepted: { readonly self: boolean; readonly opponent: boolean };
  readonly onAccept: () => void;
  readonly onDecline: () => void;
}

export function MatchFound(props: MatchFoundProps) {
  return (
    <UiRoot locale={props.locale}>
      <Content {...props} />
    </UiRoot>
  );
}

function Content({ remainingMs, receivedAt, accepted, onAccept, onDecline }: MatchFoundProps) {
  const m = useMessages().prepare;
  const remaining = useRemaining(remainingMs, receivedAt);

  // L'onglet en arrière-plan doit se signaler : on cherche une partie en faisant autre chose.
  useEffect(() => {
    const previous = document.title;
    let flip = false;
    const timer = setInterval(() => {
      flip = !flip;
      document.title = flip ? m.found.tabTitle : previous;
    }, 1000);
    return () => {
      clearInterval(timer);
      document.title = previous;
    };
  }, [m.found.tabTitle]);

  return (
    <Dialog
      open
      dismissible={false}
      title={m.found.title}
      confirmLabel={accepted.self ? m.found.accepted : m.found.accept}
      cancelLabel={m.found.decline}
      ready={!accepted.self}
      onConfirm={() => {
        onAccept();
        // Reste ouverte : la partie ne part qu'avec l'accord de l'autre.
        return false;
      }}
      onClose={onDecline}
    >
      <CountdownRing size="lg" totalMs={ACCEPT_TOTAL_MS} remainingMs={remaining} label={m.remaining}>
        {secondsLeft(remaining)}
      </CountdownRing>
      <Note>
        {accepted.self ? (accepted.opponent ? m.found.opponentAccepted : m.found.waitingOpponent) : accepted.opponent ? m.found.opponentAccepted : m.found.lead}
      </Note>
    </Dialog>
  );
}
