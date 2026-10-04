import { useEffect, useState } from "react";
import { Button, EmptyState, ProgressBar, ToastProvider, TopBar, UiRoot } from "@occulis/ui";
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
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  useEffect(() => void whoAmI().then(setIdentity), []);

  const route = useRoute();
  const section = sectionOf(route);
  const admin = identity?.signedIn === true && identity.impersonating !== true && identity.admin === true;

  return (
    <UiRoot fullPage>
      <ToastProvider>
        <ProgressBar active={identity === undefined} />
        <TopBar
          section="back-office"
          brandHref="#/"
          tabs={
            admin
              ? [
                  { href: "#/", label: "Vue d'ensemble", current: section === "overview" },
                  { href: "#/users", label: "Comptes", current: section === "users" },
                  { href: "#/matches", label: "Parties", current: section === "matches" },
                ]
              : []
          }
          end={
            <>
              {identity?.handle !== undefined && <span>{identity.handle}</span>}
              <a href="/">retour au jeu →</a>
            </>
          }
        />
        <main className="occ-page">{identity === undefined ? null : <Gate identity={identity} route={route} />}</main>
      </ToastProvider>
    </UiRoot>
  );
}

function Gate({ identity, route }: { identity: Identity; route: Route }) {
  if (!identity.signedIn) return <EmptyState>Connectez-vous depuis le jeu, puis revenez ici.</EmptyState>;
  if (identity.impersonating === true) {
    // La session est celle du joueur incarné : le back-office lui est fermé, mais le
    // chemin du retour doit rester à portée.
    return (
      <EmptyState action={<Button variant="primary" onClick={() => void stopImpersonating().then(() => location.reload())}>Revenir à mon compte</Button>}>
        Vous incarnez {identity.handle ?? "un joueur"}.
      </EmptyState>
    );
  }
  if (identity.admin !== true) return <EmptyState>Cette page est réservée aux administrateurs.</EmptyState>;

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
