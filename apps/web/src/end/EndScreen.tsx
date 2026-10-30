import type { Locale } from "@occulis/i18n";
import { Dialog, Note, UiRoot, useMessages } from "@occulis/ui";
import type { MatchEnd } from "../app/match-controller.js";
import { endTexts } from "./model.js";

/**
 * La fin d'une partie regardée, chez le spectateur — les joueurs, eux, passent à l'écran
 * de fin (`debrief/`). Le geste attendu est le retour au menu ; l'écarter laisse revoir le
 * plateau final, d'où « Quitter la partie » ramène aussi au menu.
 */
export interface EndScreenProps extends MatchEnd {
  readonly locale: Locale;
  readonly onMenu: () => void;
  readonly onBoard: () => void;
}

export function EndScreen(props: EndScreenProps) {
  return (
    <UiRoot locale={props.locale}>
      <Content {...props} />
    </UiRoot>
  );
}

function Content({ onMenu, onBoard, ...end }: EndScreenProps) {
  const m = useMessages().game.end;
  const texts = endTexts(m, end);
  return (
    <Dialog
      open
      title={texts.title}
      confirmLabel={m.menu}
      cancelLabel={m.board}
      onConfirm={() => {
        onMenu();
        return true;
      }}
      onClose={onBoard}
    >
      <Note>{texts.detail}</Note>
    </Dialog>
  );
}
