import { Banner, Button } from "@occulis/ui";

export const Suspension = () => (
  <Banner action={<Button variant="danger">Lever la suspension</Button>}>suspendu jusqu'au 2026-10-11 16:25 — triche répétée</Banner>
);

export const ReplayError = () => <Banner>Rejeu interrompu — coup 7 : unreachable</Banner>;
