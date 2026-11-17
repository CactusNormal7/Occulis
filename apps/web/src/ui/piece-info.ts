import { revealWindow } from "@occulis/ui/reveal";
import type { PieceSheet } from "../game/inspection.js";
import { messages } from "../locale/current.js";
import { describeSheet, placeAbove } from "./piece-info-model.js";

/**
 * La fiche d'une pièce : la fenêtre flottante qu'un clic droit sur une pièce ouvre
 * au-dessus d'elle. Elle dit ce que la pièce sait faire — rien de la partie.
 *
 * Non modale, comme les réglages (`settings.ts`) : Échap ou un clic ailleurs la
 * referment, et le plateau la referme dès qu'il bouge ou que la pièce n'est plus là
 * (`BoardView`). Elle s'ouvre depuis la souris et s'y replie (`revealWindow`).
 */
export interface PieceInfo {
  /** Ouvre la fiche au-dessus de `at`, en coordonnées de la fenêtre. */
  show(sheet: PieceSheet, at: { readonly x: number; readonly y: number }): void;
  close(immediately?: boolean): void;
  /** La fiche ouverte, pour que le plateau sache quand elle ne vaut plus. */
  readonly current: PieceSheet | undefined;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function attachPieceInfo(host: HTMLElement): PieceInfo {
  const panel = element("section", "piece-info");
  panel.id = "piece-info";
  panel.setAttribute("role", "dialog");
  panel.hidden = true;
  host.append(panel);

  let current: PieceSheet | undefined;
  let closing = false;

  const fill = (sheet: PieceSheet): void => {
    const texts = describeSheet(messages(), sheet);
    panel.setAttribute("aria-label", messages().game.pieceInfo.label);
    panel.dataset["side"] = sheet.piece.owner;
    panel.dataset["relation"] = sheet.relation;

    const head = element("header", "piece-info__head");
    head.append(
      element("h2", "piece-info__title", texts.title),
      element("p", "piece-info__owner", texts.owner),
    );
    const facts = element("dl", "piece-info__facts");
    for (const fact of texts.facts) {
      facts.append(element("dt", "", fact.label), element("dd", "", fact.value));
    }

    panel.replaceChildren(head);
    if (texts.alert !== undefined) panel.append(element("p", "piece-info__alert", texts.alert));
    if (texts.description !== undefined) {
      panel.append(element("p", "piece-info__lead", texts.description));
    }
    panel.append(facts);
    for (const note of texts.notes) panel.append(element("p", "piece-info__note", note));
  };

  const close = (immediately = false): void => {
    if (panel.hidden || closing) return;
    current = undefined;
    if (immediately) {
      panel.hidden = true;
      return;
    }
    closing = true;
    void revealWindow(panel, "close", "pointer").then(() => {
      // Une fiche rouverte pendant le repli garde la main.
      if (!closing) return;
      closing = false;
      panel.hidden = true;
    });
  };

  const show: PieceInfo["show"] = (sheet, at) => {
    closing = false;
    current = sheet;
    fill(sheet);
    panel.hidden = false;
    const { left, top } = placeAbove(
      at,
      { width: panel.offsetWidth, height: panel.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    void revealWindow(panel, "open", "pointer");
  };

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  // Un clic ailleurs referme ; un clic droit sur une autre pièce rouvrira aussitôt.
  document.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Node && panel.contains(event.target)) return;
    close();
  });

  return {
    show,
    close,
    get current() {
      return current;
    },
  };
}
