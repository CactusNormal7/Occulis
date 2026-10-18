import { Suspense, useState, type ReactNode } from "react";
import {
  Button,
  EmptyState,
  LocaleSwitch,
  ProgressBar,
  ToastProvider,
  TopBar,
  UiRoot,
  useMessages,
} from "@occulis/ui";
import { chooseLocale, initLocale } from "../locale/browser.js";
import { stopImpersonating, type Identity } from "../net/auth.js";
import { useHashRoute, useLoad, usePending, whenReady } from "../load/hooks.js";
import { MatchDetail } from "./MatchDetail.js";
import { parseRoute, routeHash, sectionOf, type Route } from "./model.js";
import { designSystem, identity as identityResource, resourcesOf } from "./resources.js";
import { MatchList, Overview, PlayerDetail, UserDetail, UserList } from "./views.js";
import { ScreenReady } from "../load/page.js";

/**
 * La racine du back-office. La vérification du rôle faite ici n'est qu'une politesse :
 * elle évite d'afficher une page vide à qui n'a rien à y faire. La garde réelle est côté
 * serveur, à chaque appel (`apps/server/src/admin/routes.ts` et le greffon Better Auth).
 */
export function App() {
  const [locale, setLocale] = useState(initLocale);
  return (
    <UiRoot fullPage locale={locale}>
      {/* La seule frontière d'attente de la page : rien ne paraît avant que l'écran entier
          — barre du haut comprise — ait ses données (« Chargement et premier rendu »). */}
      <Suspense fallback={<ProgressBar active />}>
        <ScreenReady />
        <Page
          localeSwitch={
            <LocaleSwitch
              value={locale}
              onChange={(next) => {
                chooseLocale(next);
                setLocale(next);
              }}
            />
          }
        />
      </Suspense>
    </UiRoot>
  );
}

function Page({ localeSwitch }: { localeSwitch: ReactNode }) {
  const m = useMessages().admin;
  const { loaded } = useLoad(identityResource);
  const identity: Identity = loaded.state === "ready" ? loaded.value : { signedIn: false };
  const pending = usePending();

  const route = useHashRoute(parseRoute, resourcesOf);
  const section = sectionOf(route);
  const admin = identity.signedIn && identity.impersonating !== true && identity.admin === true;

  return (
    <ToastProvider>
      <ProgressBar active={pending} />
      <TopBar
        section={m.section}
        brandHref="#/"
        tabs={
          admin
            ? [
                { href: "#/", label: m.tabs.overview, current: section === "overview" },
                { href: "#/users", label: m.tabs.accounts, current: section === "users" },
                { href: "#/matches", label: m.tabs.matches, current: section === "matches" },
                { href: "#/design", label: m.tabs.design, current: section === "design" },
              ]
            : []
        }
        end={
          <>
            {localeSwitch}
            {identity.handle !== undefined && <span>{identity.handle}</span>}
            <a href="/">{m.backToGame}</a>
          </>
        }
      />
      <main className="occ-page">
        <Gate identity={identity} route={route} />
      </main>
    </ToastProvider>
  );
}

function Gate({ identity, route }: { identity: Identity; route: Route }) {
  const m = useMessages().admin.gate;
  if (!identity.signedIn) return <EmptyState>{m.signIn}</EmptyState>;
  if (identity.impersonating === true) {
    // La session est celle du joueur incarné : le back-office lui est fermé, mais le
    // chemin du retour doit rester à portée.
    return (
      <EmptyState
        action={
          <Button
            variant="primary"
            onClick={() => void stopImpersonating().then(() => location.reload())}
          >
            {m.stop}
          </Button>
        }
      >
        {m.impersonating(identity.handle ?? m.aPlayer)}
      </EmptyState>
    );
  }
  if (identity.admin !== true) return <EmptyState>{m.adminsOnly}</EmptyState>;

  // Une clé par route : l'écran suivant remplace le précédent d'un bloc, sans en garder l'état.
  return (
    <div key={routeHash(route)} className="occ-stack">
      <View route={route} self={identity.handle ?? ""} />
    </div>
  );
}

function View({ route, self }: { route: Route; self: string }) {
  switch (route.view) {
    case "overview":
      return <Overview />;
    case "users":
      return <UserList search={route.search} offset={route.offset} self={self} />;
    case "user":
      return <UserDetail id={route.id} self={self} />;
    case "player":
      return <PlayerDetail id={route.id} />;
    case "matches":
      return <MatchList status={route.status} offset={route.offset} />;
    case "match":
      return <MatchDetail id={route.id} />;
    case "design":
      return <Design route={route} />;
  }
}

/** Le design system, une fois sa page arrivée (`designSystem`, chargée à part). */
function Design({ route }: { route: Extract<Route, { view: "design" }> }) {
  const { loaded } = useLoad(designSystem);
  return whenReady(loaded, ({ DesignSystem }) => <DesignSystem route={route} />);
}
