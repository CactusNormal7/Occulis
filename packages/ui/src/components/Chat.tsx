import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "../cx.js";
import { EmptyState } from "./Banner.js";
import { useMessages } from "./Locale.js";

export interface ThreadMessage {
  id: string;
  body: string;
  /** Écrit par le lecteur : aligné à droite, au trait franc. */
  mine: boolean;
  /** La précision sous le message : une heure, « lu ». */
  meta?: ReactNode | undefined;
}

export interface MessageThreadProps {
  /** Du plus ancien au plus récent ; le fil défile jusqu'au dernier. */
  messages: readonly ThreadMessage[];
  empty?: ReactNode | undefined;
  /** Un geste au-dessus du fil pour charger les messages plus anciens. */
  more?: ReactNode | undefined;
}

/**
 * Un fil de messages entre deux personnes : les siens à droite, ceux de l'autre à gauche,
 * au trait, sans bulle pleine — la ligne de la DA. Le fil reste calé sur le dernier
 * message à chaque arrivée.
 */
export function MessageThread({ messages, empty, more }: MessageThreadProps) {
  const m = useMessages();
  const end = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1]?.id;
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [last]);

  if (messages.length === 0) return <EmptyState>{empty ?? m.ui.noMessages}</EmptyState>;
  return (
    <div className="occ-thread" role="log" aria-live="polite">
      {more}
      {messages.map((message) => (
        <div
          key={message.id}
          className={cx("occ-thread__message", message.mine && "occ-thread__message--mine")}
        >
          <p>{message.body}</p>
          {message.meta !== undefined && <small>{message.meta}</small>}
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

export interface MessageComposerProps {
  /** Rend vrai si le message est parti : le champ se vide alors. */
  onSend: (body: string) => Promise<boolean>;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
  maxLength?: number | undefined;
  /** Le libellé du bouton d'envoi ; celui de la charte par défaut. */
  sendLabel?: string | undefined;
}

/** Le champ d'écriture d'un fil : Entrée envoie, Maj+Entrée passe à la ligne. */
export function MessageComposer({
  onSend,
  disabled = false,
  placeholder: given,
  maxLength,
  sendLabel,
}: MessageComposerProps) {
  const m = useMessages();
  const placeholder = given ?? m.ui.messagePlaceholder;
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const send = () => {
    const body = value.trim();
    if (body.length === 0 || busy) return;
    setBusy(true);
    void onSend(body).then((sent) => {
      setBusy(false);
      if (sent) setValue("");
    });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };
  const key = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form className="occ-composer" onSubmit={submit}>
      <textarea
        className="occ-input"
        aria-label={placeholder}
        placeholder={placeholder}
        rows={2}
        maxLength={maxLength}
        disabled={disabled}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={key}
      />
      <button
        type="submit"
        className="occ-button occ-button--primary occ-button--md"
        disabled={disabled || busy || value.trim().length === 0}
      >
        {sendLabel ?? m.ui.send}
      </button>
    </form>
  );
}
