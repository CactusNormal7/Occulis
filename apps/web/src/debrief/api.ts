import type { MeMatchDebrief } from "@occulis/protocol";
import { resource } from "../load/cache.js";
import { messages } from "../locale/current.js";
import { authMessage } from "../net/auth.js";
import { type ErrorWording, jsonInit, request } from "../net/http.js";

/**
 * L'écran de fin d'une partie, côté réseau. Le serveur seul dit s'il est encore ouvert :
 * `410` une fois que les deux joueurs l'ont quitté, lien compris.
 */
const WORDING: ErrorWording = {
  unreachable: () => messages().profile.unreachable,
  describe: (status, payload) => {
    if (status === 410) return messages().game.debrief.closed;
    if (status === 401) return messages().profile.sessionExpired;
    return authMessage(status, payload);
  },
};

const path = (matchId: string) => `/api/me/matches/${encodeURIComponent(matchId)}/debrief`;

export const debrief = (matchId: string) =>
  resource(`debrief:${matchId}`, () => request<MeMatchDebrief>(path(matchId), undefined, WORDING));

/** Note le départ du joueur ; le second départ ferme l'écran pour de bon. */
export const leave = (matchId: string) =>
  request<{ left: true }>(`${path(matchId)}/leave`, jsonInit("POST", {}), WORDING);
