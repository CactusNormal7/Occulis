import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { DEFAULT_SCENARIO, scenarioFor } from "@occulis/core";
import type { MeFeats, MeProfile, TeamPreset, TeamPresetList } from "@occulis/protocol";
import { signUp, unique } from "../test-helpers.js";

/**
 * Ce que le profil sert à la préparation d'une partie : l'Elo, les faits d'armes et leur
 * exhibition, les équipes préparées d'avance. Toujours bornés au joueur de la session.
 */

let addresses = 0;

function request(method: string, path: string, cookie: string, body?: unknown): Promise<Response> {
  addresses += 1;
  return SELF.fetch(`https://occulis.test${path}`, {
    method,
    headers: {
      Cookie: cookie,
      Origin: "https://occulis.test",
      "Content-Type": "application/json",
      "CF-Connecting-IP": `10.252.${addresses >> 8}.${addresses & 255}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function playerOf(handle: string): Promise<string> {
  const row = await env.DB.prepare("SELECT player_id FROM users WHERE email = ?").bind(`${handle}@occulis.test`).first<{ player_id: string }>();
  return row?.player_id ?? "";
}

/** Une partie terminée, gagnée par `winner` (le joueur en siège A) ou perdue. */
async function finished(playerId: string, won: boolean, at: number): Promise<void> {
  const other = `p-${crypto.randomUUID()}`;
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO players (id, handle, created_at) VALUES (?, ?, ?)").bind(other, other, 0),
    env.DB.prepare(
      "INSERT INTO matches (id, player_a, player_b, ruleset_version, scenario, started_at, finished_at, outcome) VALUES (?, ?, ?, 'provisional-1', 'ridge-1', ?, ?, ?)",
    ).bind(crypto.randomUUID(), playerId, other, at, at, JSON.stringify({ kind: "victory", winner: won ? "A" : "B", reason: "resignation" })),
  ]);
}

const defaultTeam = () => scenarioFor(DEFAULT_SCENARIO).deployment?.defaultTeams.A ?? [];

describe("profil : Elo et faits d'armes", () => {
  it("rend l'Elo du joueur, 1200 au départ", async () => {
    const cookie = await signUp(unique("elo"));
    expect(((await (await request("GET", "/api/me", cookie)).json()) as MeProfile).elo).toBe(1200);
  });

  it("calcule les faits débloqués depuis les parties, et n'exhibe que ceux-là", async () => {
    const handle = unique("fait");
    const cookie = await signUp(handle);
    const playerId = await playerOf(handle);
    for (let n = 1; n <= 3; n += 1) await finished(playerId, true, n);

    const feats = (await (await request("GET", "/api/me/feats", cookie)).json()) as MeFeats;
    const unlocked = feats.feats.filter((feat) => feat.unlocked).map((feat) => feat.id);
    expect(unlocked).toEqual(["first-match", "first-win", "streak-3"]);
    expect(feats.showcase).toEqual([]);

    expect((await request("POST", "/api/me/showcase", cookie, { feats: ["matches-50"] })).status).toBe(400);
    expect((await request("POST", "/api/me/showcase", cookie, { feats: ["first-win", "first-win"] })).status).toBe(400);
    expect((await request("POST", "/api/me/showcase", cookie, { feats: ["streak-3", "first-win"] })).status).toBe(200);
    expect(((await (await request("GET", "/api/me/feats", cookie)).json()) as MeFeats).showcase).toEqual(["streak-3", "first-win"]);
  });
});

describe("profil : équipes préparées", () => {
  it("crée, liste, renomme, change de défaut et supprime, pour le seul joueur de la session", async () => {
    const cookie = await signUp(unique("preset"));
    const other = await signUp(unique("voisin"));

    const created = await request("POST", "/api/me/presets", cookie, { name: "  Défense  ", team: defaultTeam() });
    expect(created.status).toBe(200);
    const first = (await created.json()) as TeamPreset;
    expect(first).toMatchObject({ name: "Défense", scenario: DEFAULT_SCENARIO, isDefault: true, valid: true });

    const second = (await (await request("POST", "/api/me/presets", cookie, { name: "Attaque", team: defaultTeam() })).json()) as TeamPreset;
    expect(second.isDefault).toBe(false);

    const list = (await (await request("GET", "/api/me/presets", cookie)).json()) as TeamPresetList;
    expect(list.presets).toHaveLength(2);
    expect(list.limit).toBe(10);

    // Un autre joueur ne voit ni ne touche rien.
    expect(((await (await request("GET", "/api/me/presets", other)).json()) as TeamPresetList).presets).toEqual([]);
    expect((await request("PUT", `/api/me/presets/${first.id}`, other, { name: "volé" })).status).toBe(404);
    expect((await request("DELETE", `/api/me/presets/${first.id}`, other)).status).toBe(404);

    expect(((await (await request("PUT", `/api/me/presets/${first.id}`, cookie, { name: "Mur" })).json()) as TeamPreset).name).toBe("Mur");
    expect((await request("POST", `/api/me/presets/${second.id}/default`, cookie)).status).toBe(200);
    const after = (await (await request("GET", "/api/me/presets", cookie)).json()) as TeamPresetList;
    expect(after.presets.filter((preset) => preset.isDefault).map((preset) => preset.id)).toEqual([second.id]);

    // Supprimer celui par défaut en désigne un autre.
    expect((await request("DELETE", `/api/me/presets/${second.id}`, cookie)).status).toBe(200);
    const left = (await (await request("GET", "/api/me/presets", cookie)).json()) as TeamPresetList;
    expect(left.presets.map((preset) => [preset.id, preset.isDefault])).toEqual([[first.id, true]]);
  });

  it("refuse une équipe invalide, un nom vide, et au-delà de la limite", async () => {
    const cookie = await signUp(unique("borne"));
    expect((await request("POST", "/api/me/presets", cookie, { name: "x", team: defaultTeam().slice(1) })).status).toBe(400);
    expect((await request("POST", "/api/me/presets", cookie, { name: " ", team: defaultTeam() })).status).toBe(400);
    for (let n = 0; n < 10; n += 1) {
      expect((await request("POST", "/api/me/presets", cookie, { name: `n${n}`, team: defaultTeam() })).status).toBe(200);
    }
    expect((await request("POST", "/api/me/presets", cookie, { name: "de trop", team: defaultTeam() })).status).toBe(409);
  });
});
