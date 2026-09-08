/**
 * File d'attente de matchmaking, en logique pure.
 *
 * Elle vit dans un Durable Object **global** et unique : son mono-threading écarte
 * le double appariement par construction, sans verrou (docs/architecture.md
 * section 2). Ce module n'en connaît rien — il décrit seulement la file.
 */
export interface Waiting {
  readonly playerId: string;
  /** Identifie la connexion, pas le joueur : deux onglets d'un même joueur diffèrent. */
  readonly connectionId: string;
}

export interface Pairing {
  readonly a: Waiting;
  readonly b: Waiting;
}

/**
 * Ajoute une attente, en remplaçant celle du même joueur s'il y en avait une.
 *
 * Sans ce remplacement, un joueur qui recharge sa page occuperait deux places et
 * finirait apparié avec lui-même.
 */
export function enqueue(queue: readonly Waiting[], entry: Waiting): readonly Waiting[] {
  return [...queue.filter((waiting) => waiting.playerId !== entry.playerId), entry];
}

export function dequeue(queue: readonly Waiting[], connectionId: string): readonly Waiting[] {
  return queue.filter((waiting) => waiting.connectionId !== connectionId);
}

/** Apparie les deux plus anciennes attentes, s'il y en a deux. Premier arrivé, premier servi. */
export function takePairing(queue: readonly Waiting[]): {
  readonly pairing: Pairing | undefined;
  readonly rest: readonly Waiting[];
} {
  const [a, b, ...rest] = queue;
  if (a === undefined || b === undefined) return { pairing: undefined, rest: queue };
  return { pairing: { a, b }, rest };
}
