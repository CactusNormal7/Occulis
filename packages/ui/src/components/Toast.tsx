import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CLOSE_MS, revealWindow } from "../window-reveal.js";

export interface ToastMessage {
  id: number;
  text: string;
  ok: boolean;
  leaving?: boolean | undefined;
}

type Notify = (text: string, ok?: boolean) => void;

const ToastContext = createContext<Notify>(() => undefined);

const TOAST_MS = 4500;
/** Le temps de se refermer, et une image de marge. */
const LEAVE_MS = CLOSE_MS + 20;

/**
 * Les messages éphémères, empilés en bas à droite : ils ne poussent pas la page, s'ouvrent
 * et se referment depuis leur centre, d'un cadre de leur couleur (`revealWindow`), et partent d'eux-mêmes — deux fois plus lentement pour un refus — ou au clic.
 * `useToast()` les émet depuis n'importe quel descendant.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, leaving: true } : message)));
    setTimeout(() => setMessages((current) => current.filter((message) => message.id !== id)), LEAVE_MS);
  }, []);

  const notify = useCallback<Notify>(
    (text, ok = true) => {
      if (text.length === 0) return;
      const id = Date.now() + Math.random();
      setMessages((current) => [...current, { id, text, ok }]);
      setTimeout(() => dismiss(id), ok ? TOAST_MS : TOAST_MS * 2);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <ToastStack messages={messages} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** Émet un message éphémère : `notify("Compte suspendu.")`, ou `notify(raison, false)` pour un refus. */
export function useToast(): Notify {
  return useContext(ToastContext);
}

export interface ToastStackProps {
  messages: readonly ToastMessage[];
  onDismiss?: ((id: number) => void) | undefined;
}

/** La pile affichée par `ToastProvider` ; utilisable seule pour montrer des messages fixes. */
export function ToastStack({ messages, onDismiss }: ToastStackProps) {
  return (
    <div className="occ-toasts" aria-live="polite">
      {messages.map((message) => (
        <Toast key={message.id} message={message} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ message, onDismiss }: { message: ToastMessage; onDismiss?: ((id: number) => void) | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const leaving = message.leaving === true;

  useLayoutEffect(() => {
    if (ref.current !== null) void revealWindow(ref.current, leaving ? "close" : "open");
  }, [leaving]);

  return (
    <div
      ref={ref}
      role={message.ok ? "status" : "alert"}
      className={`occ-toast occ-toast--${message.ok ? "ok" : "ko"}${leaving ? " occ-toast--leaving" : ""}`}
      onClick={() => onDismiss?.(message.id)}
    >
      {message.text}
    </div>
  );
}
