import type { Locale } from "@occulis/i18n";
import { Dialog, Note, UiRoot, useMessages } from "@occulis/ui";

/**
 * Quitter une partie vivante, c'est l'abandonner : aucun chemin ne ramène à un siège
 * quitté. La question passe donc par une fenêtre de la charte, en teinte de refus, et non
 * par `confirm()`.
 */
export interface LeaveMatchProps {
  readonly locale: Locale;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function LeaveMatch(props: LeaveMatchProps) {
  return (
    <UiRoot locale={props.locale}>
      <Content {...props} />
    </UiRoot>
  );
}

function Content({ onConfirm, onCancel }: LeaveMatchProps) {
  const m = useMessages().game.console;
  return (
    <Dialog
      open
      danger
      title={m.leaveTitle}
      confirmLabel={m.leaveAction}
      onConfirm={() => {
        onConfirm();
        return true;
      }}
      onClose={onCancel}
    >
      <Note>{m.leaveConfirm}</Note>
    </Dialog>
  );
}
