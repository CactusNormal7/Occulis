import { Button, Divider, FormPanel, PasswordField, ProviderButton, TextField } from "@occulis/ui";

export const SignIn = () => (
  <div style={{ padding: "32px 16px" }}>
  <FormPanel
    title="Sign in"
    lead="Turn-based tactics where you only see what your pieces see."
    footer={
      <>
        <a href="#forgot">Forgot your password?</a>
        <span>
          No account yet? <a href="#register">Create an account</a>
        </span>
      </>
    }
  >
    <ProviderButton provider="google" />
    <Divider>or</Divider>
    <form style={{ display: "grid", gap: 14 }} onSubmit={(event) => event.preventDefault()}>
      <TextField label="Email address" type="email" name="email" autoComplete="username" defaultValue="anne@occulis.test" />
      <PasswordField label="Password" name="password" autoComplete="current-password" />
      <Button type="submit" variant="primary">
        Sign in
      </Button>
    </form>
  </FormPanel>
  </div>
);
