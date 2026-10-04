import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./Button.js";
import { IconButton } from "./IconButton.js";

export interface DialogProps {
  open: boolean;
  title: string;
  children?: ReactNode | undefined;
  /** Le libellé du bouton de confirmation : le geste, pas « OK ». */
  confirmLabel: string;
  /** Le geste est destructeur : confirmation dans la teinte des refus. */
  danger?: boolean | undefined;
  /** Rend la confirmation possible ; relu à chaque rendu (un champ à retaper, une saisie valide). */
  ready?: boolean | undefined;
  /**
   * Appelé à la confirmation. `true` ferme la fenêtre ; `false` la garde ouverte, pour un
   * refus du serveur que l'appelant affiche.
   */
  onConfirm: () => Promise<boolean> | boolean;
  onClose: () => void;
}

/**
 * Une fenêtre modale sur `<dialog>` natif : focus piégé, Échap, page inerte derrière.
 * Elle s'ouvre et se ferme en fondu ; un clic sur le voile la ferme aussi.
 */
export function Dialog({ open, title, children, confirmLabel, danger = false, ready = true, onConfirm, onClose }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) {
      setClosing(false);
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>("input, select")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    if (closing) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) onClose();
    else setClosing(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    void Promise.resolve(onConfirm()).then((done) => {
      setBusy(false);
      if (done) close();
    });
  };

  return (
    <dialog
      ref={ref}
      className={closing ? "occ-dialog occ-dialog--closing" : "occ-dialog"}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
      onAnimationEnd={() => {
        if (closing) onClose();
      }}
    >
      <form onSubmit={submit}>
        <header className="occ-dialog__head">
          <h2>{title}</h2>
          <IconButton icon="close" label="Fermer" onClick={close} />
        </header>
        <div className="occ-dialog__body">{children}</div>
        <footer className="occ-dialog__foot">
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button type="submit" variant={danger ? "danger" : "primary"} disabled={!ready || busy}>
            {confirmLabel}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}

/** Un paragraphe d'explication dans une fenêtre ou une carte, estompé. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="occ-note">{children}</p>;
}
