import { Button, FormMessage } from "@occulis/ui";

export const Refusal = () => (
  <div style={{ maxWidth: 380 }}>
    <FormMessage tone="error">Wrong email address or password.</FormMessage>
  </div>
);

export const Success = () => (
  <div style={{ maxWidth: 380 }}>
    <FormMessage tone="success">Password changed. Every other session has been closed.</FormMessage>
  </div>
);

export const InfoWithAction = () => (
  <div style={{ maxWidth: 380 }}>
    <FormMessage tone="info" action={<Button size="sm">Resend</Button>}>
      Confirm your address to open the queue.
    </FormMessage>
  </div>
);
