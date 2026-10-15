import { MessageThread } from "@occulis/ui";

export const Conversation = () => (
  <MessageThread
    messages={[
      { id: "1", body: "A match tonight?", mine: false, meta: "18:02" },
      { id: "2", body: "Sure, after 9 pm.\nI'll send you a challenge.", mine: true, meta: "18:05 · read" },
      { id: "3", body: "Perfect.", mine: false, meta: "18:06" },
    ]}
  />
);

export const Empty = () => <MessageThread messages={[]} empty="No messages: write the first one." />;
