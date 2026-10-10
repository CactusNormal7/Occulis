import { StatTile, StatTileGrid } from "@occulis/ui";

export const Overview = () => (
  <StatTileGrid>
    <StatTile value={132} label="comptes" detail="+12 sur 7 jours" href="#" animate={false} />
    <StatTile value={118} label="adresses vérifiées" detail="89 % des comptes" animate={false} />
    <StatTile value={4} label="suspendus" animate={false} />
    <StatTile value={2} label="administrateurs" animate={false} />
    <StatTile value={341} label="parties" detail="+48 sur 7 jours" href="#" animate={false} />
    <StatTile value={9} label="en cours" href="#" animate={false} />
    <StatTile value={8204} label="coups joués" animate={false} />
    <StatTile value={140} label="profils de jeu" detail="dont sans compte" animate={false} />
  </StatTileGrid>
);
