import { PasswordField } from "@occulis/ui";

export const SignIn = () => (
  <div style={{ maxWidth: 360 }}>
    <PasswordField label="Password" name="password" autoComplete="current-password" defaultValue="correct-horse-battery" />
  </div>
);

export const NewPassword = () => (
  <div style={{ maxWidth: 360 }}>
    <PasswordField
      label="New password"
      name="password"
      autoComplete="new-password"
      hint="At least 10 characters. Passwords found in known leaks are refused."
    />
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 360 }}>
    <PasswordField
      label="Password"
      name="password"
      autoComplete="new-password"
      defaultValue="password1"
      error="This password appears in known leaks: choose another one."
    />
  </div>
);
