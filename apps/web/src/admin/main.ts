import { stopImpersonating, whoAmI } from "../net/auth.js";
import { applyPalette } from "../ui/palette.js";
import { parseRoute, routeHash, sectionOf } from "./model.js";
import { h, render, type View } from "./page.js";

/**
 * Racine du back-office, servi sous `/admin/` — une page à part, qui ne charge ni Pixi
 * ni le moteur de jeu.
 *
 * La vérification du rôle faite ici n'est qu'une politesse : elle évite d'afficher une
 * page vide à qui n'a rien à y faire. La garde réelle est côté serveur, à chaque appel
 * (`apps/server/src/admin/routes.ts` et le greffon Better Auth).
 */

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`élément #${id} absent de admin/index.html`);
  return found as T;
}

applyPalette(document.documentElement);

const root = element<HTMLElement>("admin-view");
const toasts = element<HTMLElement>("admin-toasts");
const identity = element<HTMLElement>("admin-identity");
const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>("#admin-tabs a"));

const TOAST_MS = 4500;

/**
 * Un message par geste, empilé en bas de l'écran et retiré de lui-même : il ne pousse
 * pas la page, et deux gestes rapprochés gardent chacun leur compte rendu.
 */
function toast(message: string, ok: boolean): void {
  if (message.length === 0) return;
  const item = h("div", { class: `toast ${ok ? "ok" : "ko"}`, role: ok ? "status" : "alert" }, message);
  toasts.append(item);
  const dismiss = () => {
    item.classList.add("leaving");
    // Retiré après la durée de l'animation de sortie, qu'elle ait lieu ou non (mouvement
    // réduit) : `animationend` seul laisserait le message à l'écran dans ce cas.
    setTimeout(() => item.remove(), 250);
  };
  item.addEventListener("click", dismiss);
  setTimeout(dismiss, ok ? TOAST_MS : TOAST_MS * 2);
}

/** Le message porté d'une route à la suivante par `go`. */
let carried: string | undefined;

/** Le jeton de la dernière navigation : une réponse lente ne doit pas écraser la suivante. */
let generation = 0;

let self = "";

const view = (target: HTMLElement): View => ({
  root: target,
  self,
  flash: toast,
  reload: () => void show(),
  go(route, message) {
    carried = message;
    location.hash = routeHash(route);
  },
});

async function show(): Promise<void> {
  const route = parseRoute(location.hash);
  const current = ++generation;
  if (carried !== undefined) toast(carried, true);
  carried = undefined;
  for (const tab of tabs) {
    tab.toggleAttribute("aria-current", tab.dataset["section"] === sectionOf(route));
  }

  // Dessiné dans un conteneur détaché, puis échangé d'un coup : si une autre
  // navigation a eu lieu entre-temps, ce rendu-ci est jeté au lieu de s'afficher. La
  // barre de chargement ne s'éteint qu'avec le dernier rendu demandé.
  document.body.classList.add("loading");
  const staging = document.createElement("div");
  await render(route, view(staging));
  if (current !== generation) return;
  document.body.classList.remove("loading");
  root.replaceChildren(...Array.from(staging.childNodes));
  // Rejoue l'animation d'entrée : la classe retirée puis reposée dans le même cadre ne
  // relancerait rien, d'où la lecture de `offsetWidth` entre les deux.
  root.classList.remove("enter");
  void root.offsetWidth;
  root.classList.add("enter");
}

async function start(): Promise<void> {
  const me = await whoAmI();
  if (!me.signedIn) {
    root.replaceChildren(h("div", { class: "empty" }, "Connectez-vous depuis le jeu, puis revenez ici."));
    return;
  }
  identity.textContent = me.handle ?? "";
  if (me.impersonating === true) {
    // La session est celle du joueur incarné : le back-office lui est fermé, mais le
    // chemin du retour doit rester à portée.
    const back = h("button", { type: "button", class: "solid" }, "Revenir à mon compte");
    back.addEventListener("click", () => void stopImpersonating().then(() => location.reload()));
    root.replaceChildren(h("div", { class: "empty" }, `Vous incarnez ${me.handle ?? "un joueur"}. `, back));
    return;
  }
  if (me.admin !== true) {
    root.replaceChildren(h("div", { class: "empty" }, "Cette page est réservée aux administrateurs."));
    return;
  }
  self = me.handle ?? "";
  element<HTMLElement>("admin-tabs").hidden = false;
  window.addEventListener("hashchange", () => void show());
  await show();
}

void start();
