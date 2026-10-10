/**
 * Les durées annoncées par le serveur, pour proportionner les comptes à rebours. Ce ne
 * sont **pas** des échéances : elles restent tenues par le serveur (`proposals.ts`,
 * `match-do.ts`), qui envoie le temps restant ; ces valeurs ne servent qu'au dessin.
 */
export const ACCEPT_TOTAL_MS = 15_000;
export const DEPLOYMENT_TOTAL_MS = 90_000;
