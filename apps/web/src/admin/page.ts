import type { AdminMatchSummary, AdminPlayer } from "@occulis/protocol";
import * as api from "./api.js";
import { icon, type IconName } from "./icons.js";
import {
  BAN_PRESETS,
  banDuration,
  describeAction,
  describeBan,
  describeResult,
  formatDate,
  initials,
  isAdminRole,
  pageLabel,
  quickActions,
  routeHash,
  seatHandle,
  shortAgent,
  winRate,
  type MatchStatus,
  type QuickAction,
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
  root.replaceChildren(
    ...children.filter((child): child is Node | string => typeof child === "string" || child instanceof Node),
  );
}

const link = (route: Route, text: string): HTMLAnchorElement => h("a", { href: routeHash(route) }, text);

export interface View {
  /** Le conteneur que la vue remplit. */
  readonly root: HTMLElement;
  /** Le pseudo de l'administrateur connecté, pour griser ce qu'il ne peut pas se faire. */
  readonly self: string;
  /** Un message éphémère, après une action. */
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
  fill(view.root, h("div", { class: "empty error" }, message));
}

/**
 * Chaque geste rend un `Outcome` ; le résultat s'affiche et la vue se redessine, pour
 * que ce qui est montré soit toujours ce que la base contient — jamais ce qu'on vient
 * d'envoyer.
 */
async function act(view: View, pending: Promise<api.Outcome<unknown>>, done: string): Promise<boolean> {
  const outcome = await pending;
  view.flash(outcome.ok ? done : outcome.message, outcome.ok);
  if (outcome.ok) view.reload();
  return outcome.ok;
}

// --- Briques ---------------------------------------------------------------------

function iconButton(
  name: IconName,
  label: string,
  onClick: () => void,
  options: { danger?: boolean; disabled?: string; text?: string } = {},
): HTMLButtonElement {
  const button = h(
    "button",
    {
      type: "button",
      class: `icon-button${options.danger === true ? " danger" : ""}${options.text !== undefined ? " with-text" : ""}`,
      "aria-label": label,
      "data-tip": options.disabled ?? label,
    },
    icon(name),
    options.text !== undefined && h("span", {}, options.text),
  );
  if (options.disabled !== undefined) button.disabled = true;
  else button.addEventListener("click", onClick);
  return button;
}

function badge(text: string, tone: "plain" | "ok" | "ko" | "notice" = "plain"): HTMLElement {
  return h("span", { class: `badge ${tone}` }, text);
}

function avatar(name: string, large = false): HTMLElement {
  return h("span", { class: large ? "avatar large" : "avatar", "aria-hidden": "true" }, initials(name));
}

function card(title: string | null, ...children: Child[]): HTMLElement {
  return h("section", { class: "card" }, title !== null && h("h3", {}, title), ...children);
}

/** Un titre de carte suivi d'une action à droite. */
function cardHead(title: string, action: Child): HTMLElement {
  return h("div", { class: "card-head" }, h("h3", {}, title), action);
}

function person(route: Route, name: string, detail: string): HTMLElement {
  return h(
    "a",
    { href: routeHash(route), class: "person" },
    avatar(name),
    h("span", {}, h("strong", {}, name), h("small", {}, detail)),
  );
}

function table(headings: readonly string[], rows: readonly HTMLElement[], empty = "Rien à afficher."): HTMLElement {
  if (rows.length === 0) return h("p", { class: "empty" }, empty);
  return h(
    "div",
    { class: "scroll" },
    h(
      "table",
      {},
      h("thead", {}, h("tr", {}, ...headings.map((text) => h("th", {}, text)))),
      h("tbody", {}, ...rows),
    ),
  );
}

function pager(offset: number, shown: number, total: number, at: (offset: number) => Route): HTMLElement {
  const previous = Math.max(offset - api.PAGE_SIZE, 0);
  const next = offset + api.PAGE_SIZE;
  return h(
    "nav",
    { class: "pager" },
    offset > 0 ? link(at(previous), "← précédents") : h("span", {}),
    h("span", {}, pageLabel(offset, shown, total)),
    next < total ? link(at(next), "suivants →") : h("span", {}),
  );
}

function definitions(entries: readonly [string, string | Node][]): HTMLElement {
  return h("dl", {}, ...entries.flatMap(([term, value]) => [h("dt", {}, term), h("dd", {}, value)]));
}

function field(label: string, type: string): { label: HTMLElement; input: HTMLInputElement } {
  const input = h("input", { type });
  return { label: h("label", { class: "field" }, h("span", {}, label), input), input };
}

/** Un champ et son bouton sur une ligne : le geste d'édition le plus courant de la fiche. */
function inlineEdit(
  label: string,
  type: string,
  initial: string,
  action: string,
  submit: (value: string) => Promise<boolean>,
): HTMLElement {
  const input = h("input", { type, "aria-label": label, placeholder: label });
  input.value = initial;
  const button = h("button", { type: "submit" }, action);
  const form = h("form", { class: "inline-edit" }, h("span", { class: "inline-label" }, label), input, button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    button.disabled = true;
    void submit(input.value).finally(() => {
      button.disabled = false;
    });
  });
  return form;
}

function stat(label: string, value: string): HTMLElement {
  return h("div", { class: "stat" }, h("strong", {}, value), h("span", {}, label));
}

function reducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Le chiffre monte de zéro à sa valeur — sauf si le système demande moins d'animation. */
function countUp(element: HTMLElement, value: number): void {
  if (value === 0 || reducedMotion()) {
    element.textContent = String(value);
    return;
  }
  const start = performance.now();
  const duration = 700;
  const frame = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = String(Math.round(value * eased));
    if (progress < 1) requestAnimationFrame(frame);
  };
  element.textContent = "0";
  requestAnimationFrame(frame);
}

// --- Fenêtre modale ----------------------------------------------------------------

interface DialogOptions {
  readonly title: string;
  readonly body: readonly Child[];
  readonly confirm: string;
  readonly danger?: boolean;
  /** Rend le bouton de confirmation actif ; relu à chaque saisie dans la fenêtre. */
  readonly ready?: () => boolean;
  /** Rend `true` pour fermer la fenêtre, `false` pour la garder ouverte (refus du serveur). */
  readonly onConfirm: () => Promise<boolean>;
}

/**
 * Un `<dialog>` natif : il piège le focus, se ferme à Échap et rend la page inerte
 * derrière lui sans rien réécrire de tout ça. La fermeture attend la fin de
 * l'animation de sortie avant de retirer l'élément.
 */
function openDialog(options: DialogOptions): void {
  const confirm = h("button", { type: "submit", class: options.danger === true ? "danger solid" : "solid" }, options.confirm);
  const cancel = h("button", { type: "button", class: "ghost" }, "Annuler");
  const dialog = h("dialog", { class: "modal" });
  const close = () => {
    if (dialog.classList.contains("closing")) return;
    dialog.classList.add("closing");
    const done = () => {
      dialog.close();
      dialog.remove();
    };
    if (reducedMotion()) done();
    else dialog.addEventListener("animationend", done, { once: true });
  };
  const form = h(
    "form",
    {},
    h("header", {}, h("h2", {}, options.title), iconButton("close", "Fermer", close)),
    h("div", { class: "dialog-body" }, ...options.body),
    h("footer", {}, cancel, confirm),
  );
  dialog.append(form);

  const refresh = () => {
    confirm.disabled = options.ready !== undefined && !options.ready();
  };

  form.addEventListener("input", refresh);
  form.addEventListener("click", refresh);
  cancel.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  // Un clic sur le voile, hors du formulaire, ferme aussi.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (confirm.disabled) return;
    confirm.disabled = true;
    void options.onConfirm().then((closed) => {
      if (closed) close();
      else refresh();
    });
  });

  document.body.append(dialog);
  refresh();
  dialog.showModal();
  dialog.querySelector<HTMLInputElement>("input")?.focus();
}

function banDialog(view: View, userId: string, name: string): void {
  const reason = field("motif (facultatif)", "text");
  const days = field("durée en jours", "text");
  days.input.placeholder = "vide : définitive";
  const presets = h("div", { class: "chips" });
  for (const preset of BAN_PRESETS) {
    const chip = h("button", { type: "button", class: "chip" }, preset.label);
    chip.addEventListener("click", () => {
      days.input.value = preset.days;
      for (const other of Array.from(presets.children)) other.classList.toggle("selected", other === chip);
    });
    presets.append(chip);
  }
  days.input.addEventListener("input", () => {
    for (const chip of Array.from(presets.children)) chip.classList.remove("selected");
  });

  openDialog({
    title: `Suspendre ${name}`,
    body: [
      h("p", { class: "note" }, "Ses sessions sont fermées tout de suite, et il ne peut plus en ouvrir jusqu'à la levée."),
      reason.label,
      presets,
      days.label,
    ],
    confirm: "Suspendre",
    danger: true,
    ready: () => banDuration(days.input.value).ok,
    onConfirm: () => {
      const duration = banDuration(days.input.value);
      if (!duration.ok) return Promise.resolve(false);
      return act(view, api.ban(userId, reason.input.value, duration.seconds), `${name} est suspendu.`);
    },
  });
}

/**
 * La suppression demande de retaper le pseudo : un bouton « OK » se valide d'un réflexe,
 * et ce geste-ci ne se défait pas.
 */
function deleteDialog(view: View, userId: string, name: string, onDeleted: () => void): void {
  const check = field(`retapez « ${name} » pour confirmer`, "text");
  openDialog({
    title: `Supprimer ${name}`,
    body: [
      h("p", { class: "note" }, "Le compte et ses sessions disparaissent. Le profil de jeu et l'historique des parties restent."),
      check.label,
    ],
    confirm: "Supprimer définitivement",
    danger: true,
    ready: () => check.input.value === name,
    onConfirm: async () => {
      const outcome = await api.remove(userId);
      if (!outcome.ok) {
        view.flash(outcome.message, false);
        return false;
      }
      onDeleted();
      return true;
    },
  });
}

function impersonateDialog(view: View, userId: string, name: string): void {
  openDialog({
    title: `Se connecter en tant que ${name}`,
    body: [
      h(
        "p",
        { class: "note" },
        "Vous passez dans le jeu sous son identité, pour une heure au plus. Votre session d'administrateur est mise de côté : un bandeau permet d'y revenir à tout moment.",
      ),
      h("p", { class: "note" }, "Tout ce que vous ferez — file d'attente, coups, abandon — sera fait en son nom."),
    ],
    confirm: "Incarner ce joueur",
    onConfirm: async () => {
      const outcome = await api.impersonate(userId);
      if (!outcome.ok) {
        view.flash(outcome.message, false);
        return false;
      }
      location.assign("/");
      return true;
    },
  });
}

function promoteDialog(view: View, userId: string, name: string): void {
  openDialog({
    title: `Nommer ${name} administrateur`,
    body: [h("p", { class: "note" }, "Il aura accès à ce back-office et à tous les comptes, le vôtre compris.")],
    confirm: "Nommer administrateur",
    onConfirm: () => act(view, api.setRole(userId, "admin"), `${name} est administrateur.`),
  });
}

// --- Actions rapides -----------------------------------------------------------------

const ACTION_ICONS: Record<QuickAction["kind"], IconName> = {
  view: "eye",
  verify: "mail",
  role: "shield",
  ban: "ban",
  impersonate: "impersonate",
  revoke: "logout",
  delete: "trash",
};

interface QuickUser {
  readonly id: string;
  readonly name: string;
  readonly role?: string | null;
  readonly emailVerified: boolean;
  readonly banned?: boolean | null;
}

/**
 * La rangée d'icônes d'un compte, la même dans la liste et sur la fiche : un geste se
 * retrouve au même endroit d'une vue à l'autre. `quickActions()` dit ce qui est permis.
 */
function quickBar(view: View, user: QuickUser, onDeleted: () => void): HTMLElement {
  const run = (kind: QuickAction["kind"]) => {
    switch (kind) {
      case "view":
        location.hash = routeHash({ view: "user", id: user.id });
        return;
      case "verify":
        void act(view, api.update(user.id, { emailVerified: !user.emailVerified }), "Vérification modifiée.");
        return;
      case "role":
        if (isAdminRole(user.role)) void act(view, api.setRole(user.id, "user"), `${user.name} n'est plus administrateur.`);
        else promoteDialog(view, user.id, user.name);
        return;
      case "ban":
        if (user.banned === true) void act(view, api.unban(user.id), `Suspension de ${user.name} levée.`);
        else banDialog(view, user.id, user.name);
        return;
      case "impersonate":
        impersonateDialog(view, user.id, user.name);
        return;
      case "revoke":
        void act(view, api.revokeSessions(user.id), `Sessions de ${user.name} fermées.`);
        return;
      case "delete":
        deleteDialog(view, user.id, user.name, onDeleted);
        return;
    }
  };

  return h(
    "div",
    { class: "quick-bar" },
    ...quickActions(user, view.self)
      .filter((action) => action.kind !== "view")
      .map((action) =>
        iconButton(
          action.kind === "ban" && user.banned === true ? "unban" : ACTION_ICONS[action.kind],
          action.label,
          () => run(action.kind),
          {
            ...(action.danger === true ? { danger: true } : {}),
            ...(action.disabled !== undefined ? { disabled: action.disabled } : {}),
          },
        ),
      ),
  );
}

function stateBadges(user: QuickUser): HTMLElement {
  return h(
    "span",
    { class: "badges" },
    isAdminRole(user.role) && badge("admin", "notice"),
    user.emailVerified ? badge("vérifiée", "ok") : badge("non vérifiée"),
    user.banned === true && badge("suspendu", "ko"),
  );
}

// --- Vue d'ensemble --------------------------------------------------------------

async function overview(view: View): Promise<void> {
  const [stats, recent, newcomers] = await Promise.all([
    api.stats(),
    api.matches({ offset: 0, limit: 6 }),
    api.users("", 0),
  ]);
  if (!stats.ok) return fail(view, stats.message);
  const s = stats.value;

  const tile = (label: string, value: number, detail?: string, route?: Route) => {
    const number = h("strong", {});
    countUp(number, value);
    const content = [number, h("span", {}, label), detail !== undefined && h("small", {}, detail)];
    return route === undefined
      ? h("div", { class: "tile" }, ...content)
      : h("a", { class: "tile", href: routeHash(route) }, ...content);
  };

  const accounts: Route = { view: "users", search: "", offset: 0 };
  const games: Route = { view: "matches", status: null, offset: 0 };
  const verifiedShare = s.users === 0 ? 0 : Math.round((s.verifiedUsers / s.users) * 100);

  fill(
    view.root,
    h("div", { class: "page-head" }, h("h2", {}, "Vue d'ensemble")),
    h(
      "div",
      { class: "tiles" },
      tile("comptes", s.users, `+${s.signupsLastWeek} sur 7 jours`, accounts),
      tile("adresses vérifiées", s.verifiedUsers, `${verifiedShare} % des comptes`),
      tile("suspendus", s.bannedUsers),
      tile("administrateurs", s.admins),
      tile("parties", s.matches, `+${s.matchesLastWeek} sur 7 jours`, games),
      tile("en cours", s.ongoingMatches, undefined, { view: "matches", status: "ongoing", offset: 0 }),
      tile("coups joués", s.actions),
      tile("profils de jeu", s.players, "dont sans compte"),
    ),
    h(
      "div",
      { class: "grid" },
      card(
        null,
        cardHead("Dernières parties", link(games, "tout voir")),
        recent.ok ? matchTable(recent.value.matches, true) : h("p", { class: "error" }, recent.message),
      ),
      card(
        null,
        cardHead("Derniers inscrits", link(accounts, "tout voir")),
        newcomers.ok
          ? h(
              "ul",
              { class: "people" },
              ...newcomers.value.users
                .slice(0, 6)
                .map((user) =>
                  h("li", {}, person({ view: "user", id: user.id }, user.name, formatDate(user.createdAt)), stateBadges(user)),
                ),
            )
          : h("p", { class: "error" }, newcomers.message),
      ),
    ),
  );
}

// --- Comptes ---------------------------------------------------------------------

async function userList(view: View, search: string, offset: number): Promise<void> {
  const result = await api.users(search, offset);
  if (!result.ok) return fail(view, result.message);
  const { users, total } = result.value;

  const input = h("input", { type: "search", name: "q", placeholder: "Pseudo ou adresse…", "aria-label": "Rechercher" });
  input.value = search;
  const searchForm = h("form", { class: "search" }, icon("search"), input);
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    location.hash = routeHash({ view: "users", search: input.value, offset: 0 });
  });

  const rows = users.map((user) =>
    h(
      "tr",
      {},
      h("td", {}, person({ view: "user", id: user.id }, user.name, user.email)),
      h("td", {}, stateBadges(user)),
      h("td", { class: "muted" }, formatDate(user.createdAt)),
      h(
        "td",
        { class: "actions-cell" },
        quickBar(view, user, () => {
          view.flash(`Compte ${user.name} supprimé.`, true);
          view.reload();
        }),
      ),
    ),
  );

  fill(
    view.root,
    h(
      "div",
      { class: "page-head" },
      h("h2", {}, "Comptes", h("span", { class: "count" }, String(total))),
      h(
        "div",
        { class: "page-tools" },
        searchForm,
        iconButton("plus", "Créer un compte", () => createUserDialog(view), { text: "Nouveau compte" }),
      ),
    ),
    card(
      null,
      table(
        ["compte", "état", "inscription", ""],
        rows,
        search.length > 0 ? `Aucun compte ne correspond à « ${search} ».` : "Aucun compte.",
      ),
      pager(offset, users.length, total, (next) => ({ view: "users", search, offset: next })),
    ),
  );
}

function createUserDialog(view: View): void {
  const name = field("pseudo", "text");
  const email = field("adresse", "email");
  const password = field("mot de passe", "password");
  const role = h("select", {}, h("option", { value: "user" }, "joueur"), h("option", { value: "admin" }, "administrateur"));
  openDialog({
    title: "Nouveau compte",
    body: [
      name.label,
      email.label,
      password.label,
      h("label", { class: "field" }, h("span", {}, "rôle"), role),
      h("p", { class: "note" }, "L'adresse n'est pas vérifiée à la création : marquez-la depuis la fiche si besoin."),
    ],
    confirm: "Créer",
    ready: () => name.input.value.trim().length >= 2 && email.input.value.includes("@") && password.input.value.length > 0,
    onConfirm: async () => {
      const result = await api.create(email.input.value, password.input.value, name.input.value, role.value);
      if (!result.ok) {
        view.flash(result.message, false);
        return false;
      }
      view.go({ view: "user", id: result.value.user.id }, `Compte ${result.value.user.name} créé.`);
      return true;
    },
  });
}

async function userDetail(view: View, id: string): Promise<void> {
  const result = await api.user(id);
  if (!result.ok) return fail(view, result.message);
  const user = result.value;
  const playerId = user.playerId ?? undefined;

  const [sessions, player, history] = await Promise.all([
    api.sessions(id),
    playerId === undefined ? undefined : api.player(playerId),
    playerId === undefined ? undefined : api.matches({ player: playerId, offset: 0, limit: 6 }),
  ]);

  const copyId = iconButton("copy", "Copier l'identifiant", () => {
    void navigator.clipboard.writeText(user.id).then(
      () => view.flash("Identifiant copié.", true),
      () => view.flash("Copie refusée par le navigateur.", false),
    );
  });

  const hero = h(
    "section",
    { class: "hero" },
    avatar(user.name, true),
    h(
      "div",
      { class: "hero-text" },
      h("h2", {}, user.name, stateBadges(user)),
      h(
        "p",
        { class: "muted meta" },
        h("span", {}, user.email),
        h("span", {}, `inscrit le ${formatDate(user.createdAt)}`),
        h("span", {}, h("code", {}, `${user.id.slice(0, 10)}…`), copyId),
      ),
    ),
    quickBar(view, user, () =>
      view.go({ view: "users", search: "", offset: 0 }, `Compte ${user.name} supprimé. Son profil et ses parties restent.`),
    ),
  );

  let banner: HTMLElement | false = false;
  if (user.banned === true) {
    const lift = h("button", { type: "button" }, "Lever la suspension");
    lift.addEventListener("click", () => void act(view, api.unban(id), "Suspension levée."));
    banner = h("div", { class: "banner" }, icon("ban"), h("span", {}, describeBan(user)), lift);
  }

  const sessionList = sessions.ok ? sessions.value.sessions : [];
  const sessionsBody = !sessions.ok
    ? h("p", { class: "error" }, sessions.message)
    : sessionList.length === 0
      ? h("p", { class: "empty" }, "Aucune session ouverte.")
      : h(
          "ul",
          { class: "sessions" },
          ...sessionList.map((session) =>
            h(
              "li",
              {},
              h(
                "span",
                {},
                h("strong", {}, shortAgent(session.userAgent)),
                h(
                  "small",
                  {},
                  `${session.ipAddress ?? "IP inconnue"} · ouverte le ${formatDate(session.createdAt)} · expire le ${formatDate(session.expiresAt)}`,
                ),
              ),
              iconButton("close", "Fermer cette session", () => void act(view, api.revokeSession(session.token), "Session fermée.")),
            ),
          ),
        );

  fill(
    view.root,
    h("p", { class: "crumbs" }, link({ view: "users", search: "", offset: 0 }, "← Comptes")),
    hero,
    banner,
    h(
      "div",
      { class: "grid" },
      h(
        "div",
        { class: "column" },
        player?.ok === true
          ? profileCard(player.value)
          : card("Profil de jeu", h("p", { class: "empty" }, player?.ok === false ? player.message : "Aucun profil lié.")),
        history?.ok === true &&
          card(
            null,
            cardHead(
              "Dernières parties",
              playerId !== undefined && link({ view: "player", id: playerId }, `tout l'historique (${history.value.total})`),
            ),
            matchTable(history.value.matches, true),
          ),
      ),
      h(
        "div",
        { class: "column" },
        card(
          "Modifier",
          h(
            "div",
            { class: "edits" },
            playerId !== undefined &&
              inlineEdit("pseudo", "text", user.name, "Renommer", (value) =>
                act(view, api.rename(playerId, value), "Pseudo changé, sur le compte et sur le profil de jeu."),
              ),
            inlineEdit("adresse", "email", user.email, "Changer", (value) =>
              act(view, api.update(id, { email: value }), "Adresse changée."),
            ),
            inlineEdit("mot de passe", "password", "", "Définir", (value) =>
              act(view, api.setPassword(id, value), "Mot de passe défini."),
            ),
          ),
        ),
        card(
          null,
          cardHead(
            `Sessions ouvertes (${sessionList.length})`,
            sessionList.length > 0 &&
              iconButton("logout", "Fermer toutes les sessions", () => void act(view, api.revokeSessions(id), "Sessions fermées."), {
                text: "tout fermer",
              }),
          ),
          sessionsBody,
        ),
      ),
    ),
  );
}

// --- Profils et parties -----------------------------------------------------------

function profileCard(player: AdminPlayer): HTMLElement {
  const { played, won, lost, ongoing } = player.record;
  const rate = winRate(player.record);
  return card(
    "Profil de jeu",
    h(
      "div",
      { class: "stats" },
      stat("parties", String(played)),
      stat("victoires", String(won)),
      stat("défaites", String(lost)),
      stat("en cours", String(ongoing)),
      stat("taux", rate === null ? "—" : `${rate} %`),
      stat("ELO", String(player.elo)),
    ),
  );
}

async function playerDetail(view: View, id: string): Promise<void> {
  const [player, history] = await Promise.all([api.player(id), api.matches({ player: id, offset: 0, limit: 100 })]);
  if (!player.ok) return fail(view, player.message);
  const p = player.value;

  fill(
    view.root,
    h(
      "p",
      { class: "crumbs" },
      p.userId === null
        ? link({ view: "users", search: "", offset: 0 }, "← Comptes")
        : link({ view: "user", id: p.userId }, "← Fiche du compte"),
    ),
    h(
      "section",
      { class: "hero" },
      avatar(p.handle, true),
      h(
        "div",
        { class: "hero-text" },
        h("h2", {}, p.handle, p.userId === null && badge("sans compte")),
        h("p", { class: "muted" }, `profil créé le ${formatDate(p.createdAt)}`),
      ),
    ),
    profileCard(p),
    card(
      null,
      cardHead(
        "Historique",
        history.ok && h("span", { class: "muted" }, pageLabel(0, history.value.matches.length, history.value.total)),
      ),
      history.ok ? matchTable(history.value.matches) : h("p", { class: "error" }, history.message),
    ),
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
  fill(
    view.root,
    h(
      "div",
      { class: "page-head" },
      h("h2", {}, "Parties", h("span", { class: "count" }, String(result.value.total))),
      h(
        "nav",
        { class: "segmented" },
        ...filters.map(([value, label]) => {
          const a = link({ view: "matches", status: value, offset: 0 }, label);
          if (value === status) a.setAttribute("aria-current", "true");
          return a;
        }),
      ),
    ),
    card(
      null,
      matchTable(result.value.matches),
      pager(offset, result.value.matches.length, result.value.total, (next) => ({ view: "matches", status, offset: next })),
    ),
  );
}

function resultBadge(match: AdminMatchSummary): HTMLElement {
  return match.outcome === null ? badge("en cours", "notice") : badge(describeResult(match), "ok");
}

async function matchDetail(view: View, id: string): Promise<void> {
  const result = await api.match(id);
  if (!result.ok) return fail(view, result.message);
  const m = result.value;

  fill(
    view.root,
    h("p", { class: "crumbs" }, link({ view: "matches", status: null, offset: 0 }, "← Parties")),
    h(
      "section",
      { class: "hero versus" },
      person({ view: "player", id: m.playerA.id }, m.playerA.handle, "siège A"),
      h("span", { class: "vs" }, "contre"),
      person({ view: "player", id: m.playerB.id }, m.playerB.handle, "siège B"),
      h("span", { class: "hero-end" }, resultBadge(m)),
    ),
    h(
      "div",
      { class: "grid" },
      card(
        "Partie",
        definitions([
          ["identifiant", h("code", {}, m.id)],
          ["début", formatDate(m.startedAt)],
          ["fin", formatDate(m.finishedAt)],
          ["règles", m.rulesetVersion],
          ["carte", m.scenario],
          ["coups", String(m.log.length)],
        ]),
      ),
      card(
        `Log (${m.log.length})`,
        m.replayError !== null && h("p", { class: "error" }, `Rejeu impossible — ${m.replayError}`),
        table(
          ["#", "camp", "coup"],
          m.log.map((entry) =>
            h(
              "tr",
              {},
              h("td", { class: "muted" }, String(entry.seq)),
              h("td", {}, entry.player === null ? "?" : `${entry.player} · ${seatHandle(m, entry.player)}`),
              h("td", {}, h("code", {}, describeAction(entry.action))),
            ),
          ),
          "Aucun coup joué.",
        ),
      ),
    ),
  );
}

function matchTable(matches: readonly AdminMatchSummary[], compact = false): HTMLElement {
  const versus = (m: AdminMatchSummary) =>
    h(
      "span",
      { class: "versus-cell" },
      link({ view: "player", id: m.playerA.id }, m.playerA.handle),
      h("span", { class: "muted" }, " contre "),
      link({ view: "player", id: m.playerB.id }, m.playerB.handle),
    );
  const open = (m: AdminMatchSummary) =>
    h(
      "a",
      { href: routeHash({ view: "match", id: m.id }), class: "icon-link", "aria-label": "Voir la partie", "data-tip": "Voir la partie" },
      icon("eye"),
    );
  return table(
    compact ? ["partie", "résultat", ""] : ["début", "partie", "résultat", "coups", ""],
    matches.map((m) =>
      h(
        "tr",
        {},
        !compact && h("td", { class: "muted" }, formatDate(m.startedAt)),
        h("td", {}, versus(m), compact && h("small", { class: "muted block" }, formatDate(m.startedAt))),
        h("td", {}, resultBadge(m)),
        !compact && h("td", { class: "muted" }, String(m.actions)),
        h("td", { class: "actions-cell" }, open(m)),
      ),
    ),
    "Aucune partie.",
  );
}
