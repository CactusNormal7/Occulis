import type { Waiting } from "./pairing.js";

/**
 * Salons privés, en logique pure.
 *
 * Un salon est une attente nommée : un joueur ouvre, obtient un code, le transmet
 * par le moyen qu'il veut, et le second joueur entre avec ce code. C'est la seule
 * différence avec la file d'attente — l'appariement, lui, produit exactement la même
 * partie (docs/architecture.md section 2).
 *
 * Ce module ne connaît ni Durable Object ni WebSocket : il décrit la table des
 * salons, et rien d'autre.
 */
export interface Room {
  readonly code: string;
  readonly host: Waiting;
}

/**
 * L'alphabet des codes : ni `B`, ni `I`, ni `L`, ni `O`, ni `S`, ni `Z`, ni `0`,
 * ni `1`, ni `2`, ni `5`, ni `8`. Un code se lit à voix haute ou se recopie à la
 * main — les paires confondables (`O`/`0`, `I`/`1`, `S`/`5`, `B`/`8`, `Z`/`2`) y
 * coûteraient une partie manquée à chaque erreur de lecture.
 */
export const CODE_ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";

export const CODE_LENGTH = 5;

/**
 * Un code à partir d'octets fournis par l'appelant.
 *
 * L'aléa entre par paramètre plutôt que d'être tiré ici, pour que la fabrication du
 * code reste éprouvable sans horloge ni générateur — même raison qui tient
 * `crypto.randomUUID` hors de `@occulis/core` (CLAUDE.md).
 *
 * Le modulo penche très légèrement vers le début de l'alphabet (256 n'est pas un
 * multiple de 25). Sans conséquence : un code n'est ni un secret ni un jeton — il
 * ne donne accès qu'à un salon que son hôte vient d'ouvrir et surveille.
 */
export function codeFrom(bytes: Uint8Array): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[(bytes[index] ?? 0) % CODE_ALPHABET.length];
  }
  return code;
}

/** Un code saisi par un joueur : les espaces et la casse ne doivent pas le trahir. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export interface Opening {
  readonly rooms: readonly Room[];
  readonly room: Room;
}

/**
 * Ouvre un salon pour cet hôte, ou **rend celui qu'il tient déjà**.
 *
 * La reconnexion est la raison d'être de ce second cas : le client renvoie son
 * intention à chaque fois que le socket se rétablit, et un nouveau code à chaque
 * coupure périmerait celui que l'hôte vient d'envoyer à son adversaire.
 *
 * L'attente est mise à jour au passage : c'est la connexion vivante qu'il faudra
 * prévenir de l'appariement, pas celle qui vient de tomber.
 */
export function openRoom(rooms: readonly Room[], host: Waiting, code: string): Opening {
  const existing = rooms.find((room) => room.host.playerId === host.playerId);
  if (existing !== undefined) {
    const room: Room = { code: existing.code, host };
    return { rooms: rooms.map((other) => (other.code === room.code ? room : other)), room };
  }

  const room: Room = { code, host };
  return { rooms: [...rooms, room], room };
}

/** Referme le salon tenu par cette connexion, s'il y en a un. */
export function closeRoom(rooms: readonly Room[], connectionId: string): readonly Room[] {
  return rooms.filter((room) => room.host.connectionId !== connectionId);
}

export interface Taken {
  readonly room: Room | undefined;
  readonly rooms: readonly Room[];
}

/**
 * Retire le salon portant ce code, pour l'apparier.
 *
 * Le retrait est immédiat et non différé : le salon consommé ne doit plus pouvoir
 * l'être une seconde fois, sinon un troisième joueur muni du même code se verrait
 * ouvrir une partie contre un hôte déjà occupé ailleurs.
 */
export function takeRoom(rooms: readonly Room[], code: string): Taken {
  const room = rooms.find((candidate) => candidate.code === code);
  if (room === undefined) return { room: undefined, rooms };
  return { room, rooms: rooms.filter((candidate) => candidate.code !== code) };
}

/** Un code libre, dérivé des octets tirés ; `undefined` si tous sont déjà pris. */
export function freeCode(rooms: readonly Room[], draws: readonly Uint8Array[]): string | undefined {
  for (const draw of draws) {
    const code = codeFrom(draw);
    if (!rooms.some((room) => room.code === code)) return code;
  }
  return undefined;
}
