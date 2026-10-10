import { Badge, BadgeRow, IconButton, Person, QuickBar, Table } from "@occulis/ui";

export const Accounts = () => (
  <Table columns={["compte", "état", "inscription", ""]} rowCount={2}>
    <tr>
      <td>
        <Person name="anne" detail="anne@occulis.test" href="#" />
      </td>
      <td>
        <BadgeRow>
          <Badge>vérifiée</Badge>
        </BadgeRow>
      </td>
      <td className="occ-muted">2026-10-03 09:12</td>
      <td className="occ-actions-cell">
        <QuickBar>
          <IconButton icon="ban" label="Suspendre" danger />
          <IconButton icon="trash" label="Supprimer le compte" danger />
        </QuickBar>
      </td>
    </tr>
    <tr>
      <td>
        <Person name="bruno" detail="bruno@occulis.test" href="#" />
      </td>
      <td>
        <BadgeRow>
          <Badge tone="dim">non vérifiée</Badge>
          <Badge tone="refused">suspendu</Badge>
        </BadgeRow>
      </td>
      <td className="occ-muted">2026-09-28 21:40</td>
      <td className="occ-actions-cell">
        <QuickBar>
          <IconButton icon="unban" label="Lever la suspension" />
          <IconButton icon="trash" label="Supprimer le compte" danger />
        </QuickBar>
      </td>
    </tr>
  </Table>
);

export const Empty = () => <Table columns={["partie", "résultat"]} rowCount={0} empty="Aucune partie." />;
