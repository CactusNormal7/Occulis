import { whoAmI } from "../net/auth.js";
import { applyPalette } from "../ui/palette.js";
import { parseRoute, routeHash, sectionOf } from "./model.js";
import { render, type View } from "./page.js";

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
const flashArea = element<HTMLElement>("admin-flash");
const identity = element<HTMLElement>("admin-identity");
const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>("#admin-tabs a"));

const view: View = {
  root,
  flash(message, ok) {
    flashArea.textContent = message;
    flashArea.dataset["state"] = ok ? "ok" : "ko";
  },
  reload: () => void show(false),
  go(route, message) {
    carried = message;
    location.hash = routeHash(route);
  },
};

/** Le message porté d'une route à la suivante par `go`. */
let carried: string | undefined;

/** Le jeton de la dernière navigation : une réponse lente ne doit pas écraser la suivante. */
let generation = 0;

async function show(clearFlash = true): Promise<void> {
  const route = parseRoute(location.hash);
  const current = ++generation;
  if (carried !== undefined) view.flash(carried, true);
  else if (clearFlash) view.flash("", true);
  carried = undefined;
  for (const tab of tabs) {
    tab.toggleAttribute("aria-current", tab.dataset["section"] === sectionOf(route));
  }

  // Dessiné dans un conteneur détaché, puis échangé d'un coup : si une autre
  // navigation a eu lieu entre-temps, ce rendu-ci est jeté au lieu de s'afficher.
  const staging = document.createElement("div");
  await render(route, { ...view, root: staging });
  if (current === generation) root.replaceChildren(...Array.from(staging.childNodes));
}

async function start(): Promise<void> {
  const me = await whoAmI();
  if (!me.signedIn) {
    root.textContent = "Connectez-vous depuis le jeu, puis revenez ici.";
    return;
  }
  identity.textContent = me.handle ?? "";
  if (me.admin !== true) {
    root.textContent = "Cette page est réservée aux administrateurs.";
    return;
  }
  element<HTMLElement>("admin-tabs").hidden = false;
  window.addEventListener("hashchange", () => void show());
  await show();
}

void start();
