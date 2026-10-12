import { MessageThread } from "@occulis/ui";

export const Conversation = () => (
  <MessageThread
    messages={[
      { id: "1", body: "Une partie ce soir ?", mine: false, meta: "18:02" },
      { id: "2", body: "Oui, après 21 h.\nJe t'envoie un défi.", mine: true, meta: "18:05 · lu" },
      { id: "3", body: "Parfait.", mine: false, meta: "18:06" },
    ]}
  />
);

export const Empty = () => <MessageThread messages={[]} empty="Aucun message : écrivez le premier." />;
