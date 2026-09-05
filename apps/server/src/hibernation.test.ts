import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Garde-fou sur l'invariant de coût le plus cher du projet.
 *
 * Un Durable Object qui garde un WebSocket ouvert sans hiberner coûte ~20 000 fois
 * plus cher, sans aucune différence fonctionnelle visible (docs/costs.md) — donc
 * sans qu'aucun test de comportement ne puisse le détecter. Ce qui distingue les
 * deux tient à un seul appel : `ctx.acceptWebSocket()` autorise l'hibernation,
 * `server.accept()` l'interdit. C'est cet appel qu'on vérifie, faute de pouvoir
 * observer la facture.
 *
 * Vérifier le comportement réel demanderait `@cloudflare/vitest-pool-workers` et un
 * runtime workerd ; à faire le jour où le serveur aura des tests d'intégration.
 */
const DURABLE_OBJECTS = ["src/match-do.ts", "src/queue-do.ts"];

describe("hibernation des Durable Objects", () => {
  it.each(DURABLE_OBJECTS)("%s accepte ses sockets via ctx.acceptWebSocket", (path) => {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

    expect(source).toContain("this.ctx.acceptWebSocket(");
    expect(source).not.toMatch(/\.accept\(\s*\)/);
  });

  it.each(DURABLE_OBJECTS)("%s gère ses messages par webSocketMessage, pas par listener", (path) => {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

    // Un `addEventListener("message")` retiendrait le DO en mémoire : les
    // gestionnaires d'hibernation sont des méthodes, réappelées après réveil.
    expect(source).toContain("webSocketMessage(");
    expect(source).not.toContain('addEventListener("message"');
  });
});
