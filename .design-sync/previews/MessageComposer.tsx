import { MessageComposer } from "@occulis/ui";

export const Default = () => <MessageComposer onSend={async () => true} maxLength={500} />;

export const Disabled = () => <MessageComposer onSend={async () => false} disabled placeholder="Session d'emprunt : lecture seule" />;
