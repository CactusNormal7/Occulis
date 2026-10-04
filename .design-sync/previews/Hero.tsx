import { Badge, BadgeRow, Hero, IconButton, QuickBar, TileAvatar } from "@occulis/ui";

export const Account = () => (
  <Hero
    avatar={<TileAvatar name="anne" size="lg" />}
    title="anne"
    badges={
      <BadgeRow>
        <Badge>vérifiée</Badge>
      </BadgeRow>
    }
    meta={["anne@occulis.test", "inscrite le 2026-10-03 09:12"]}
    actions={
      <QuickBar framed>
        <IconButton icon="mail" label="Marquer l'adresse non vérifiée" />
        <IconButton icon="shield" label="Nommer administrateur" />
        <IconButton icon="ban" label="Suspendre" danger />
        <IconButton icon="impersonate" label="Se connecter en tant que ce joueur" />
        <IconButton icon="logout" label="Fermer toutes les sessions" />
        <IconButton icon="trash" label="Supprimer le compte" danger />
      </QuickBar>
    }
  />
);

export const Suspended = () => (
  <Hero
    avatar={<TileAvatar name="bruno" size="lg" />}
    title="bruno"
    badges={
      <BadgeRow>
        <Badge tone="dim">non vérifiée</Badge>
        <Badge tone="refused">suspendu</Badge>
      </BadgeRow>
    }
    meta={["bruno@occulis.test", "inscrit le 2026-09-28 21:40"]}
  />
);
