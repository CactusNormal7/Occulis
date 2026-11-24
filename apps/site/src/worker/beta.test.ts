import { describe, expect, it } from "vitest";
import {
  MIN_FILL_MS,
  PENDING_TTL_MS,
  confirm,
  hashToken,
  normalizeEmail,
  signup,
  unsubscribe,
  unsubscribeToken,
  verifyUnsubscribeToken,
  type BetaDeps,
  type BetaStore,
  type ConfirmationMail,
  type Signup,
} from "./beta";

interface Stored extends Signup {
  tokenHash: string | null;
  consentText: string;
}

function memoryStore(): BetaStore & { rows: Map<string, Stored> } {
  const rows = new Map<string, Stored>();
  return {
    rows,
    async find(email) {
      return [...rows.values()].find((row) => row.email === email);
    },
    async savePending(signup, tokenHash, consentText) {
      const existing = rows.get(signup.id);
      if (existing?.status === "confirmed") return;
      rows.set(signup.id, { ...signup, tokenHash, consentText });
    },
    async confirm(tokenHash, now) {
      const row = [...rows.values()].find(
        (candidate) =>
          candidate.tokenHash === tokenHash &&
          candidate.status === "pending" &&
          candidate.createdAt > now - PENDING_TTL_MS,
      );
      if (row === undefined) return undefined;
      const confirmed: Stored = { ...row, status: "confirmed", tokenHash: null };
      rows.set(row.id, confirmed);
      return confirmed;
    },
    async remove(id) {
      return rows.delete(id);
    },
    async purgePending(before) {
      let count = 0;
      for (const [id, row] of rows) {
        if (row.status === "pending" && row.createdAt < before) {
          rows.delete(id);
          count += 1;
        }
      }
      return count;
    },
  };
}

function setup(overrides: Partial<BetaDeps> = {}) {
  const store = memoryStore();
  const sent: ConfirmationMail[] = [];
  let clock = 1_000_000;
  const deps: BetaDeps = {
    store,
    sendConfirmation: async (mail) => {
      sent.push(mail);
    },
    withinLimit: async () => true,
    now: () => clock,
    siteUrl: "https://site.test",
    secret: "secret",
    consentText: "J'accepte.",
    ...overrides,
  };
  return {
    store,
    sent,
    deps,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

const valid = { email: "Ada@Example.org ", consent: "yes", website: "", shown: "" };
const tokenOf = (mail: ConfirmationMail | undefined) =>
  new URL(mail!.confirmUrl).searchParams.get("token")!;

describe("normalizeEmail", () => {
  it("garde une adresse plausible, en minuscules et sans espaces", () => {
    expect(normalizeEmail("  Ada@Example.ORG ")).toBe("ada@example.org");
  });

  it.each([
    "",
    "ada",
    "ada@",
    "@example.org",
    "ada@example",
    "a b@example.org",
    `${"a".repeat(250)}@x.org`,
  ])("refuse %j", (raw) => {
    expect(normalizeEmail(raw)).toBeUndefined();
  });
});

describe("signup", () => {
  it("enregistre une attente et envoie un lien de confirmation", async () => {
    const { store, sent, deps } = setup();
    expect(await signup(valid, deps)).toBe("sent");
    const [row] = store.rows.values();
    expect(row).toMatchObject({
      email: "ada@example.org",
      status: "pending",
      consentText: "J'accepte.",
    });
    expect(sent).toHaveLength(1);
    // Seule l'empreinte du jeton est gardée.
    expect(row!.tokenHash).toBe(await hashToken(tokenOf(sent[0])));
    expect(row!.tokenHash).not.toBe(tokenOf(sent[0]));
  });

  it("refuse une adresse invalide ou un consentement absent", async () => {
    const { store, deps } = setup();
    expect(await signup({ ...valid, email: "pas une adresse" }, deps)).toBe("invalid-email");
    expect(await signup({ ...valid, consent: "" }, deps)).toBe("consent-required");
    expect(store.rows.size).toBe(0);
  });

  it("répond comme à une personne au robot qui remplit le piège, sans rien garder", async () => {
    const { store, sent, deps } = setup();
    expect(await signup({ ...valid, website: "https://spam.test" }, deps)).toBe("sent");
    expect(store.rows.size + sent.length).toBe(0);
  });

  it("ignore un envoi trop rapide après l'affichage du formulaire", async () => {
    const { store, deps } = setup();
    const shown = String(deps.now() - MIN_FILL_MS + 100);
    expect(await signup({ ...valid, shown }, deps)).toBe("sent");
    expect(store.rows.size).toBe(0);
  });

  it("signale le dépassement de la limite d'envois", async () => {
    const { deps } = setup({ withinLimit: async () => false });
    expect(await signup(valid, deps)).toBe("too-many");
  });

  it("n'écrit pas à une adresse déjà confirmée, et ne le laisse pas deviner", async () => {
    const { sent, deps } = setup();
    await signup(valid, deps);
    await confirm(tokenOf(sent[0]), deps);
    expect(await signup(valid, deps)).toBe("sent");
    expect(sent).toHaveLength(1);
  });

  it("renvoie un nouveau lien à une attente, et l'ancien cesse de valoir", async () => {
    const { store, sent, deps } = setup();
    await signup(valid, deps);
    await signup(valid, deps);
    expect(store.rows.size).toBe(1);
    expect(await confirm(tokenOf(sent[0]), deps)).toBe(false);
    expect(await confirm(tokenOf(sent[1]), deps)).toBe(true);
  });

  it("rend un échec quand le message ne part pas", async () => {
    const { deps } = setup({
      sendConfirmation: async () => {
        throw new Error("Resend indisponible");
      },
    });
    expect(await signup(valid, deps)).toBe("failed");
  });
});

describe("confirm", () => {
  it("confirme une fois, puis le lien ne sert plus", async () => {
    const { store, sent, deps } = setup();
    await signup(valid, deps);
    expect(await confirm(tokenOf(sent[0]), deps)).toBe(true);
    expect([...store.rows.values()][0]!.status).toBe("confirmed");
    expect(await confirm(tokenOf(sent[0]), deps)).toBe(false);
  });

  it("refuse un lien de plus de sept jours", async () => {
    const { sent, deps, advance } = setup();
    await signup(valid, deps);
    advance(PENDING_TTL_MS + 1);
    expect(await confirm(tokenOf(sent[0]), deps)).toBe(false);
  });
});

describe("unsubscribe", () => {
  it("efface la ligne avec le lien du message", async () => {
    const { store, sent, deps } = setup();
    await signup(valid, deps);
    const token = new URL(sent[0]!.unsubscribeUrl).searchParams.get("token")!;
    expect(await unsubscribe(token, deps)).toBe(true);
    expect(store.rows.size).toBe(0);
    // Un second clic reste un succès.
    expect(await unsubscribe(token, deps)).toBe(true);
  });

  it("refuse un jeton falsifié ou signé avec un autre secret", async () => {
    const { deps } = setup();
    const forged = await unsubscribeToken("autre secret", "abc");
    expect(await verifyUnsubscribeToken("secret", forged)).toBeUndefined();
    expect(await verifyUnsubscribeToken("secret", "abc")).toBeUndefined();
    expect(await verifyUnsubscribeToken("secret", "abc.def.ghi")).toBeUndefined();
    expect(await unsubscribe(forged, deps)).toBe(false);
  });
});
