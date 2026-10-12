import {
  PROTOCOL_VERSION,
  type SocialClientMessage,
  type SocialServerMessage,
  type SocialSurface,
} from "@occulis/protocol";
import { type ChannelStatus, openChannel } from "./channel.js";

/**
 * Le canal social de la page : présence des amis, demandes, messages, défis. Ouvert
 * tant que le joueur est connecté, sur le jeu comme sur le profil — `surface` dit
 * lequel, car seul le jeu sait s'asseoir à une partie.
 *
 * Il transporte et c'est tout : `social/model.ts` interprète.
 */
export interface SocialChannel {
  close(): void;
}

export function openSocial(
  surface: SocialSurface,
  onMessage: (message: SocialServerMessage) => void,
  onStatus?: (status: ChannelStatus) => void,
): SocialChannel {
  const channel = openChannel<SocialServerMessage, SocialClientMessage>({
    path: `/api/social?surface=${surface}`,
    hello: { kind: "hello", protocol: PROTOCOL_VERSION },
    onMessage,
    ...(onStatus === undefined ? {} : { onStatus }),
  });
  return { close: () => channel.close() };
}
