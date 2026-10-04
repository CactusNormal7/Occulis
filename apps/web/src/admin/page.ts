import type { AdminMatchSummary, AdminPlayer } from "@occulis/protocol";
import * as api from "./api.js";
import {
  banDuration,
  describeAction,
  describeBan,
  describeResult,
  formatDate,
  pageLabel,
  routeHash,
  seatHandle,
  type MatchStatus,
  type Route,
} from "./model.js";

/**
 * Le dessin des vues du back-office. Tout passe par `textContent`, jamais par
 * `innerHTML` : un pseudo, une adresse ou un motif de suspension sont saisis par
 * quelqu'un d'autre que l'administrateur qui les lit.
 */

type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child);
  }
  return element;
}

/** `replaceChildren`, qui accepte les enfants conditionnels que `h` accepte. */
function fill(root: HTMLElement, ...children: Child[]): void {
  root.replaceChildren(...children.filter((child): child is Node | string => typeof child === "string" || child instanceof Node));
}

const link = (route: Route, text: string): HTMLAnchorElement => h("a", { href: routeHash(route) }, text);

export interface View {
  /** Le conteneur que la vue remplit. */
  readonly root: HTMLElement;
  /** Un message en tête de page, après une action. */
  flash(message: string, ok: boolean): void;
  /** Redessine la route courante, après une écriture. */
  reload(): void;
  /** Change de route en gardant un message, qu'une navigation simple effacerait. */
  go(route: Route, message: string): void;
}

export async function render(route: Route, view: View): Promise<void> {
  switch (route.view) {
    case "overview":
      return overview(view);
    case "users":
      return userList(view, route.search, route.offset);
    case "user":
      return userDetail(view, route.id);
    case "matches":
      return matchList(view, route.status, route.offset);
    case "match":
      return matchDetail(view, route.id);
    case "player":
      return playerDetail(view, route.id);
  }
}

function fail(view: View, message: string): void {
  fill(view.root, h("p", { class: "error" }, message));
}

// --- Vue d'ensemble --------------------------------------------------------------

async function overview(view: View): Promise<void> {
  const [stats, recent] = await Promise.all([api.stats(), api.matches({ offset: 0, limit: 8 })]);
  if (!stats.ok) return fail(view, stats.message);
  const s = stats.value;

  const tile = (label: string, value: number, detail?: string) =>
    h("div", { class: "tile" }, h("strong", {}, String(value)), h("span", {}, label), detail && h("small", {}, detail));

  fill(view.root, 
    h("h2", {}, "Vue d'ensemble"),
    h(
      "div",
      { class: "tiles" },
      tile("comptes", s.users, `${s.signupsLastWeek} sur 7 jours`),
      tile("adresses vérifiées", s.verifiedUsers),
      tile("comptes suspendus", s.bannedUsers),
      tile("administrateurs", s.admins),
      tile("profils de jeu", s.players, "dont ceux sans compte"),
      tile("parties", s.matches, `${s.matchesLastWeek} sur 7 jours`),
      tile("parties en cours", s.ongoingMatches),
      tile("coups joués", s.actions),
    ),
    h("h3", {}, "Dernières parties"),
    recent.ok ? matchTable(recent.value.matches) : h("p", { class: "error" }, recent.message),
  );
}

// --- Comptes ---------------------------------------------------------------------

async function userList(view: View, search: string, offset: number): Promise<void> {
  const result = await api.users(search, offset);
  if (!result.ok) return fail(view, result.message);
  const { users, total } = result.value;

  const input = h("input", { type: "search", name: "q", placeholder: "pseudo ou adresse", value: search });
  const searchForm = h("form", { class: "inline" }, input, h("button", { type: "submit" }, "Chercher"));
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    location.hash = routeHash({ view: "users", search: input.value, offset: 0 });
  });

  const rows = users.map((user) =>
    h(
      "tr",
      {},
      h("td", {}, link({ view: "user", id: user.id }, user.name)),
      h("td", {}, user.email),
      h("td", {}, user.role ?? "user"),
      h("td", {}, user.emailVerified ? "oui" : "non"),
      h("td", { class: user.banned ? "warn" : "" }, describeBan(user)),
      h("td", {}, formatDate(user.createdAt)),
    ),
  );

  fill(view.root, 
    h("h2", {}, "Comptes"),
    searchForm,
    table(["pseudo", "adresse", "rôle", "vérifiée", "état", "inscription"], rows),
    pager(offset, users.length, total, (next) => ({ view: "users", search, offset: next })),
    createUserForm(view),
  );
}

function createUserForm(view: View): HTMLElement {
  const name = field("pseudo", "text");
  const email = field("adresse", "email");
  const password = field("mot de passe", "password");
  const role = select(["user", "admin"], "user");
  const form = h(
    "form",
    {},
    name.label,
    email.label,
    password.label,
    h("label", { class: "field" }, h("span", {}, "rôle"), role),
    h("button", { type: "submit" }, "Créer le compte"),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void api.create(email.input.value, password.input.value, name.input.value, role.value).then((result) => {
      if (!result.ok) return view.flash(result.message, false);
      view.go({ view: "user", id: result.value.user.id }, `Compte ${result.value.user.name} créé. Son adresse n'est pas vérifiée.`);
    });
  });
  return h("details", {}, h("summary", {}, "Créer un compte"), form);
}

async function userDetail(view: View, id: string): Promise<void> {
  const result = await api.user(id);
  if (!result.ok) return fail(view, result.message);
  const user = result.value;
  const playerId = user.playerId ?? undefined;

  const [sessions, player, history] = await Promise.all([
    api.sessions(id),
    playerId === undefined ? undefined : api.player(playerId),
    playerId === undefined ? undefined : api.matches({ player: playerId, offset: 0, limit: 10 }),
  ]);

  // Chaque geste rend un `Outcome` ; le résultat s'affiche en tête et la fiche se
  // redessine, pour que ce qui est montré soit toujours ce que la base contient.
  const act = (pending: Promise<api.Outcome<unknown>>, done: string) => {
    void pending.then((outcome) => {
      view.flash(outcome.ok ? done : outcome.message, outcome.ok);
      if (outcome.ok) view.reload();
    });
  };

  const isAdmin = (user.role ?? "").split(",").includes("admin");

  fill(view.root, 
    h("p", { class: "crumbs" }, link({ view: "users", search: "", offset: 0 }, "Comptes"), " / ", user.name),
    h("h2", {}, user.name),
    definitions([
      ["identifiant", user.id],
      ["adresse", user.email],
      ["adresse vérifiée", user.emailVerified ? "oui" : "non"],
      ["rôle", user.role ?? "user"],
      ["état", describeBan(user)],
      ["inscription", formatDate(user.createdAt)],
    ]),

    player?.ok ? record(player.value) : player && h("p", { class: "error" }, player.message),
    history?.ok &&
      h(
        "section",
        {},
        h("h3", {}, "Dernières parties"),
        matchTable(history.value.matches),
        playerId !== undefined &&
          h("p", {}, link({ view: "player", id: playerId }, `Tout l'historique (${history.value.total})`)),
      ),

    h("h3", {}, "Modifier"),
    h(
      "div",
      { class: "actions" },
      playerId !== undefined &&
        oneField("Pseudo", "text", user.name, "Renommer", (value) =>
          act(api.rename(playerId, value), "Pseudo changé, sur le compte et sur le profil de jeu."),
        ),
      oneField("Adresse", "email", user.email, "Changer l'adresse", (value) =>
        act(api.update(id, { email: value }), "Adresse changée."),
      ),
      oneField("Nouveau mot de passe", "password", "", "Définir", (value) =>
        act(api.setPassword(id, value), "Mot de passe défini."),
      ),
      h(
        "div",
        { class: "row" },
        button(user.emailVerified ? "Marquer l'adresse non vérifiée" : "Marquer l'adresse vérifiée", () =>
          act(api.update(id, { emailVerified: !user.emailVerified }), "Vérification modifiée."),
        ),
        button(isAdmin ? "Retirer le rôle administrateur" : "Nommer administrateur", () =>
          act(api.setRole(id, isAdmin ? "user" : "admin"), "Rôle modifié."),
        ),
      ),
    ),

    h("h3", {}, "Suspension"),
    user.banned
      ? button("Lever la suspension", () => act(api.unban(id), "Suspension levée."))
      : banForm((reason, seconds) => act(api.ban(id, reason, seconds), "Compte suspendu, sessions fermées."), view),

    h("h3", {}, "Sessions"),
    sessions.ok
      ? h(
          "div",
          {},
          table(
            ["ouverte", "expire", "adresse IP", "navigateur", ""],
            sessions.value.sessions.map((session) =>
              h(
                "tr",
                {},
                h("td", {}, formatDate(session.createdAt)),
                h("td", {}, formatDate(session.expiresAt)),
                h("td", {}, session.ipAddress ?? "—"),
                h("td", { class: "clip" }, session.userAgent ?? "—"),
                h("td", {}, button("Fermer", () => act(api.revokeSession(session.token), "Session fermée."))),
              ),
            ),
          ),
          sessions.value.sessions.length > 0 &&
            button("Fermer toutes les sessions", () => act(api.revokeSessions(id), "Sessions fermées.")),
        )
      : h("p", { class: "error" }, sessions.message),

    h("h3", {}, "Suppression"),
    deleteForm(user.name, () => {
      void api.remove(id).then((outcome) => {
        if (!outcome.ok) return view.flash(outcome.message, false);
        view.go({ view: "users", search: "", offset: 0 }, `Compte ${user.name} supprimé. Son profil et ses parties restent.`);
      });
    }),
  );
}

function banForm(submit: (reason: string, seconds: number | undefined) => void, view: View): HTMLElement {
  const reason = field("motif", "text");
  const days = field("durée en jours (vide : définitive)", "text");
  const form = h("form", {}, reason.label, days.label, h("button", { type: "submit" }, "Suspendre"));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const duration = banDuration(days.input.value);
    if (!duration.ok) return view.flash("Durée illisible : un nombre de jours, ou rien.", false);
    submit(reason.input.value, duration.seconds);
  });
  return form;
}

/**
 * La suppression demande de retaper le pseudo : la boîte `confirm()` se valide d'un
 * réflexe, et ce geste-ci ne se défait pas.
 */
function deleteForm(handle: string, confirmed: () => void): HTMLElement {
  const check = field(`retaper « ${handle} » pour confirmer`, "text");
  const submit = h("button", { type: "submit", class: "danger" }, "Supprimer le compte");
  submit.disabled = true;
  check.input.addEventListener("input", () => {
    submit.disabled = check.input.value !== handle;
  });
  const form = h(
    "form",
    {},
    h("p", { class: "note" }, "Le compte et ses sessions disparaissent. Le profil de jeu et l'historique des parties restent."),
    check.label,
    submit,
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (check.input.value === handle) confirmed();
  });
  return form;
}

// --- Profils et parties -----------------------------------------------------------

function record(player: AdminPlayer): HTMLElement {
  const { played, won, lost, ongoing } = player.record;
  return h(
    "section",
    {},
    h("h3", {}, "Profil de jeu"),
    definitions([
      ["profil", player.id],
      ["ELO", String(player.elo)],
      ["parties", `${played} — ${won} victoires, ${lost} défaites, ${ongoing} en cours`],
    ]),
  );
}

async function playerDetail(view: View, id: string): Promise<void> {
  const [player, history] = await Promise.all([api.player(id), api.matches({ player: id, offset: 0, limit: 100 })]);
  if (!player.ok) return fail(view, player.message);
  const p = player.value;

  fill(view.root, 
    h("p", { class: "crumbs" }, "Profils / ", p.handle),
    h("h2", {}, p.handle),
    p.userId === null
      ? h("p", { class: "note" }, "Profil sans compte, créé par une partie directe (POST /api/matches).")
      : h("p", {}, link({ view: "user", id: p.userId }, "Voir le compte")),
    record(p),
    h("h3", {}, "Historique"),
    history.ok
      ? h("div", {}, matchTable(history.value.matches), h("p", { class: "note" }, pageLabel(0, history.value.matches.length, history.value.total)))
      : h("p", { class: "error" }, history.message),
  );
}

async function matchList(view: View, status: MatchStatus | null, offset: number): Promise<void> {
  const result = await api.matches({ status, offset });
  if (!result.ok) return fail(view, result.message);

  const filters: [MatchStatus | null, string][] = [
    [null, "toutes"],
    ["ongoing", "en cours"],
    ["finished", "terminées"],
  ];
  fill(view.root, 
    h("h2", {}, "Parties"),
    h(
      "nav",
      { class: "filters" },
      ...filters.map(([value, label]) => {
        const a = link({ view: "matches", status: value, offset: 0 }, label);
        if (value === status) a.setAttribute("aria-current", "true");
        return a;
      }),
    ),
    matchTable(result.value.matches),
    pager(offset, result.value.matches.length, result.value.total, (next) => ({ view: "matches", status, offset: next })),
  );
}

async function matchDetail(view: View, id: string): Promise<void> {
  const result = await api.match(id);
  if (!result.ok) return fail(view, result.message);
  const m = result.value;

  fill(view.root, 
    h("p", { class: "crumbs" }, link({ view: "matches", status: null, offset: 0 }, "Parties"), " / ", m.id),
    h("h2", {}, `${m.playerA.handle} contre ${m.playerB.handle}`),
    definitions([
      ["identifiant", m.id],
      ["siège A", link({ view: "player", id: m.playerA.id }, m.playerA.handle)],
      ["siège B", link({ view: "player", id: m.playerB.id }, m.playerB.handle)],
      ["résultat", describeResult(m)],
      ["début", formatDate(m.startedAt)],
      ["fin", formatDate(m.finishedAt)],
      ["règles", m.rulesetVersion],
      ["carte", m.scenario],
    ]),
    h("h3", {}, `Log (${m.log.length} coups)`),
    m.replayError !== null && h("p", { class: "error" }, `Rejeu impossible — ${m.replayError}`),
    table(
      ["#", "camp", "coup"],
      m.log.map((entry) =>
        h(
          "tr",
          {},
          h("td", {}, String(entry.seq)),
          h("td", {}, entry.player === null ? "?" : `${entry.player} · ${seatHandle(m, entry.player)}`),
          h("td", {}, describeAction(entry.action)),
        ),
      ),
    ),
  );
}

function matchTable(matches: readonly AdminMatchSummary[]): HTMLElement {
  return table(
    ["début", "siège A", "siège B", "résultat", "coups", ""],
    matches.map((m) =>
      h(
        "tr",
        {},
        h("td", {}, formatDate(m.startedAt)),
        h("td", {}, link({ view: "player", id: m.playerA.id }, m.playerA.handle)),
        h("td", {}, link({ view: "player", id: m.playerB.id }, m.playerB.handle)),
        h("td", {}, describeResult(m)),
        h("td", {}, String(m.actions)),
        h("td", {}, link({ view: "match", id: m.id }, "détail")),
      ),
    ),
  );
}

// --- Briques -----------------------------------------------------------------------

function table(headings: readonly string[], rows: readonly HTMLElement[]): HTMLElement {
  if (rows.length === 0) return h("p", { class: "note" }, "Rien à afficher.");
  return h(
    "div",
    { class: "scroll" },
    h("table", {}, h("thead", {}, h("tr", {}, ...headings.map((text) => h("th", {}, text)))), h("tbody", {}, ...rows)),
  );
}

function pager(offset: number, shown: number, total: number, at: (offset: number) => Route): HTMLElement {
  const previous = Math.max(offset - api.PAGE_SIZE, 0);
  const next = offset + api.PAGE_SIZE;
  return h(
    "nav",
    { class: "pager" },
    offset > 0 && link(at(previous), "← précédents"),
    h("span", {}, pageLabel(offset, shown, total)),
    next < total && link(at(next), "suivants →"),
  );
}

function definitions(entries: readonly [string, string | Node][]): HTMLElement {
  return h("dl", {}, ...entries.flatMap(([term, value]) => [h("dt", {}, term), h("dd", {}, value)]));
}

function field(label: string, type: string): { label: HTMLElement; input: HTMLInputElement } {
  const input = h("input", { type });
  return { label: h("label", { class: "field" }, h("span", {}, label), input), input };
}

function select(options: readonly string[], selected: string): HTMLSelectElement {
  const element = h("select", {}, ...options.map((value) => h("option", { value }, value)));
  element.value = selected;
  return element;
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const element = h("button", { type: "button" }, text);
  element.addEventListener("click", onClick);
  return element;
}

function oneField(label: string, type: string, initial: string, action: string, submit: (value: string) => void): HTMLElement {
  const { label: wrapper, input } = field(label, type);
  input.value = initial;
  const form = h("form", { class: "inline" }, wrapper, h("button", { type: "submit" }, action));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(input.value);
  });
  return form;
}
