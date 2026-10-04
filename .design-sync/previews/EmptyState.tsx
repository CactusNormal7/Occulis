import { Button, EmptyState } from "@occulis/ui";

export const NoResult = () => <EmptyState>Aucun compte ne correspond à « zorglub ».</EmptyState>;

export const WithAction = () => (
  <EmptyState action={<Button variant="primary">Revenir à mon compte</Button>}>Vous incarnez anne.</EmptyState>
);

export const Failure = () => <EmptyState error>Serveur injoignable.</EmptyState>;
