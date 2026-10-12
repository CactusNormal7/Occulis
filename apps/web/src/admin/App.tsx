import { useEffect, useState, type ReactNode } from "react";
import { Button, EmptyState, LocaleSwitch, ProgressBar, ToastProvider, TopBar, UiRoot, useMessages } from "@occulis/ui";
import { chooseLocale, initLocale } from "../i18n/browser.js";
import { stopImpersonating, whoAmI, type Identity } from "../net/auth.js";
import { useRoute } from "./hooks.js";
import { MatchDetail } from "./MatchDetail.js";
import { routeHash, sectionOf, type Route } from "./model.js";
import { MatchList, Overview, PlayerDetail, UserDetail, UserList } from "./views.js";

/**
 * La racine du back-office. La vérification du rôle faite ici n'est qu'une politesse :
 * elle évite d'afficher une page vide à qui n'a rien à y faire. La garde réelle est côté
 * serveur, à chaque appel (`apps/server/src/admin/routes.ts` et le greffon Better Auth).
 */
export function App() {
  const [locale, setLocale] = useState(initLocale);
  return (
    <UiRoot fullPage locale={locale}>
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
    </UiRoot>
  );
}

function Page({ localeSwitch }: { localeSwitch: ReactNode }) {
  const m = useMessages().admin;
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  useEffect(() => void whoAmI().then(setIdentity), []);

  const route = useRoute();
  const section = sectionOf(route);
  const admin = identity?.signedIn === true && identity.impersonating !== true && identity.admin === true;

  return (
    <ToastProvider>
      <ProgressBar active={identity === undefined} />
      <TopBar
        section={m.section}
        brandHref="#/"
        tabs={
          admin
            ? [
                { href: "#/", label: m.tabs.overview, current: section === "overview" },
                { href: "#/users", label: m.tabs.accounts, current: section === "users" },
                { href: "#/matches", label: m.tabs.matches, current: section === "matches" },
              ]
            : []
        }
        end={
          <>
            {localeSwitch}
            {identity?.handle !== undefined && <span>{identity.handle}</span>}
            <a href="/">{m.backToGame}</a>
          </>
        }
      />
      <main className="occ-page">{identity === undefined ? null : <Gate identity={identity} route={route} />}</main>
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
      <EmptyState action={<Button variant="primary" onClick={() => void stopImpersonating().then(() => location.reload())}>{m.stop}</Button>}>
        {m.impersonating(identity.handle ?? m.aPlayer)}
      </EmptyState>
    );
  }
  if (identity.admin !== true) return <EmptyState>{m.adminsOnly}</EmptyState>;

  // La clé rejoue l'animation d'entrée à chaque navigation.
  return (
    <div key={routeHash(route)} className="occ-stack occ-enter">
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
  }
}
