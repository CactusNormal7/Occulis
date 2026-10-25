import { useEffect, useState } from "react";
import {
  BackLink,
  Button,
  Card,
  EmptyState,
  MessageComposer,
  MessageThread,
  useMessages,
  useToast,
} from "@occulis/ui";
import type { ChatMessage } from "@occulis/protocol";
import { useLoad } from "../load/hooks.js";
import * as friends from "../social/api.js";
import { friendOf, readAll } from "../social/model.js";
import * as resources from "./resources.js";
import { useSocial } from "./SocialProvider.js";
import { messageTime, profileHash } from "./model.js";

// --- Les messages ---------------------------------------------------------------------

export function ChatView({ id, readOnly }: { id: string; readOnly: boolean }) {
  const all = useMessages().social;
  const m = all.chat;
  const notify = useToast();
  const { state, listen, update } = useSocial();
  const friend = friendOf(state, id);
  // Le fil lu avec l'écran ; s'y ajoutent ce que le canal pousse, ce qu'on envoie et les
  // messages plus anciens chargés à la demande.
  const { loaded } = useLoad(resources.chat(id));
  const page = loaded.state === "ready" ? loaded.value : undefined;
  const failure = loaded.state === "failed" ? loaded.message : undefined;
  const [messages, setMessages] = useState<readonly ChatMessage[]>(() => page?.messages ?? []);
  const [hasMore, setHasMore] = useState(page?.hasMore ?? false);

  // Lire le fil le marque lu — sauf sous emprunt, où rien ne doit changer pour le joueur.
  const markRead = () => {
    if (readOnly) return;
    void friends.markRead(id);
    update((current) => readAll(current, id));
  };

  // Une relecture du fil s'y fond sans perdre ce qui est arrivé entre-temps.
  useEffect(() => {
    if (page === undefined) return;
    setMessages((current) => merged(page.messages, current));
    setHasMore(page.hasMore);
    markRead();
    // Chaque page relue, et elle seule : `markRead` est recréée à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const unlisten = listen((message) => {
      if (message.kind !== "message") return;
      const incoming = message.message;
      if (incoming.sender !== id && incoming.recipient !== id) return;
      setMessages((current) => withMessage(current, incoming));
      if (incoming.sender === id) markRead();
    });
    return unlisten;
    // Un abonnement par fil ; `listen` et `markRead` changent d'identité à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const older = () => {
    const first = messages[0];
    if (first === undefined) return;
    void friends.messages(id, first.createdAt).then((outcome) => {
      if (!outcome.ok) return;
      setMessages((current) => merged(outcome.value.messages, current));
      setHasMore(outcome.value.hasMore);
    });
  };

  const send = async (body: string): Promise<boolean> => {
    const outcome = await friends.sendMessage(id, body);
    if (!outcome.ok) {
      notify(outcome.message, false);
      return false;
    }
    const sent = outcome.value;
    setMessages((current) => withMessage(current, sent));
    return true;
  };

  const name = friend?.handle ?? all.friend.someone;
  const now = Date.now();
  return (
    <>
      <BackLink href={profileHash({ view: "friend", id, offset: 0 })}>{name}</BackLink>
      <Card title={m.title(name)}>
        {failure !== undefined ? (
          <EmptyState error>{failure}</EmptyState>
        ) : (
          <>
            <MessageThread
              empty={m.empty}
              more={
                hasMore && (
                  <Button size="sm" variant="ghost" onClick={older}>
                    {m.older}
                  </Button>
                )
              }
              messages={messages.map((message) => ({
                id: message.id,
                body: message.body,
                mine: message.sender !== id,
                meta: `${messageTime(message.createdAt, now)}${message.sender !== id && message.readAt !== null ? ` · ${m.read}` : ""}`,
              }))}
            />
            <MessageComposer
              onSend={send}
              disabled={readOnly}
              maxLength={500}
              placeholder={readOnly ? all.readOnly : m.placeholder}
              sendLabel={m.send}
            />
          </>
        )}
      </Card>
    </>
  );
}

/** Ajoute un message au fil, une seule fois : il peut arriver par l'envoi et par le canal. */
function withMessage(
  current: readonly ChatMessage[],
  message: ChatMessage,
): readonly ChatMessage[] {
  return current.some((m) => m.id === message.id) ? current : [...current, message];
}

/** Deux morceaux du même fil, sans doublon, dans l'ordre d'envoi. */
function merged(
  incoming: readonly ChatMessage[],
  current: readonly ChatMessage[],
): readonly ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}
