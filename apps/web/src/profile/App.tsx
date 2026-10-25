import { Suspense, useState, type ReactNode } from "react";
import {
  Banner,
  Button,
  EmptyState,
  ProgressBar,
  ToastProvider,
  TopBar,
  LocaleSwitch,
  UiRoot,
  useMessages,
} from "@occulis/ui";
import type { MeProfile } from "@occulis/protocol";
import { ROUTE_PATHS, stopImpersonating } from "../net/auth.js";
import { useHashRoute, useLoad, usePending } from "../load/hooks.js";
import type { Loaded } from "../load/cache.js";
import * as resources from "./resources.js";
import { chooseLocale, initLocale } from "../locale/browser.js";
import { unreadTotal } from "../social/model.js";
import { SocialProvider, useSocial } from "./SocialProvider.js";
import { FriendMatchReplay, FriendView, FriendsView } from "./Friends.js";
import { ChatView } from "./Chat.js";
import { Account } from "./Account.js";
import { Matches, MatchReplay } from "./Matches.js";
import { parseProfileRoute, profileHash, tabOf, type ProfileRoute } from "./model.js";
import { ScreenReady } from "../load/page.js";

/**
 * La page de profil, servie sous `/profile/` : le pendant du back-office, pour son propre
 * compte. En React sur `@occulis/ui`, sans classe ni couleur propres.
 *
 * Tout ce que la page grise, le serveur le refuse aussi : l'identité vient du cookie,
 * chaque requête est bornée au compte de la session, et une session d'emprunt n'y
 * modifie rien (`apps/server/src/me/routes.ts`, `auth/better-auth.ts`).
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
  const { loaded, reload } = useLoad(resources.profile);
  const verified = loaded.state === "ready" && loaded.value.emailVerified;
  // Sous emprunt, le serveur refuse le canal social : ne pas l'ouvrir pour rien.
  const social = verified && !(loaded.state === "ready" && loaded.value.impersonating);
  const frame = (
    <SocialProvider enabled={social}>
      <Frame localeSwitch={localeSwitch} loaded={loaded} reload={reload} />
    </SocialProvider>
  );
  // Les non-lus de l'onglet Amis font partie de la barre du haut : la page attend la liste
  // avec le reste, plutôt que de voir l'onglet changer de libellé une fois affichée.
  return <ToastProvider>{verified ? <WithFriends>{frame}</WithFriends> : frame}</ToastProvider>;
}

function WithFriends({ children }: { children: ReactNode }) {
  useLoad(resources.friendsOverview);
  return children;
}

function Frame({
  localeSwitch,
  loaded,
  reload,
}: {
  localeSwitch: ReactNode;
  loaded: Loaded<MeProfile>;
  reload: () => void;
}) {
  const all = useMessages();
  const m = all.profile;
  const route = useHashRoute(parseProfileRoute, resources.resourcesOf);
  const signedIn = loaded.state === "ready";
  const unread = unreadTotal(useSocial().state);

  return (
    <>
      <ProgressBar active={usePending()} />
      <TopBar
        section={m.section}
        brandHref="/"
        tabs={
          signedIn
            ? [
                {
                  href: profileHash({ view: "account" }),
                  label: m.tabs.account,
                  current: route.view === "account",
                },
                {
                  href: profileHash({ view: "matches", offset: 0 }),
                  label: m.tabs.matches,
                  current: tabOf(route) === "matches",
                },
                {
                  href: profileHash({ view: "friends" }),
                  label: unread > 0 ? all.social.tabUnread(unread) : all.social.tab,
                  current: tabOf(route) === "friends",
                },
              ]
            : []
        }
        end={
          <>
            {localeSwitch}
            {loaded.state === "ready" && <span>{loaded.value.handle}</span>}
            <a href="/">{m.backToGame}</a>
          </>
        }
      />
      <main className="occ-page">
        <Gate loaded={loaded} route={route} reload={reload} />
      </main>
    </>
  );
}

function Gate({
  loaded,
  route,
  reload,
}: {
  loaded: Loaded<MeProfile>;
  route: ProfileRoute;
  reload: () => void;
}) {
  const m = useMessages().profile;
  if (loaded.state === "failed") {
    return (
      <EmptyState action={<a href={ROUTE_PATHS.signin}>{m.signIn}</a>}>{loaded.message}</EmptyState>
    );
  }
  const profile = loaded.value;
  return (
    <div key={profileHash(route)} className="occ-stack">
      {profile.impersonating && (
        <Banner
          icon="impersonate"
          action={
            <Button
              variant="danger"
              onClick={() => void stopImpersonating().then(() => location.assign("/admin/"))}
            >
              {m.impersonation.stop}
            </Button>
          }
        >
          {m.impersonation.text}
        </Banner>
      )}
      {route.view === "account" && <Account profile={profile} reload={reload} />}
      {route.view === "matches" && (
        <Matches offset={route.offset} readOnly={profile.impersonating} />
      )}
      {route.view === "match" && <MatchReplay id={route.id} />}
      {route.view === "friends" && <FriendsView readOnly={profile.impersonating} />}
      {route.view === "friend" && (
        <FriendView id={route.id} offset={route.offset} readOnly={profile.impersonating} />
      )}
      {route.view === "friendMatch" && <FriendMatchReplay id={route.id} matchId={route.matchId} />}
      {route.view === "chat" && <ChatView id={route.id} readOnly={profile.impersonating} />}
    </div>
  );
}
