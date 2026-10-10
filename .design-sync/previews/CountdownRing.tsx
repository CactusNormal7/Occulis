import { CountdownRing } from "@occulis/ui";

export const Calm = () => <CountdownRing totalMs={15_000} remainingMs={11_000} label="Time left">11</CountdownRing>;

export const Urgent = () => <CountdownRing totalMs={15_000} remainingMs={3_000} label="Time left">3</CountdownRing>;

export const Large = () => (
  <CountdownRing size="lg" totalMs={90_000} remainingMs={54_000} label="Time left">
    54
  </CountdownRing>
);
