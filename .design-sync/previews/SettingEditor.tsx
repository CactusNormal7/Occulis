import { SettingEditor, TextField } from "@occulis/ui";

const noop = () => undefined;

export const Default = () => (
  <div style={{ maxWidth: 420 }}>
    <SettingEditor submitLabel="Save" onSubmit={noop} onCancel={noop} note="You can change it again in 30 days.">
      <TextField label="New handle" name="handle" defaultValue="Cactus" />
    </SettingEditor>
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 420 }}>
    <SettingEditor submitLabel="Save" onSubmit={noop} onCancel={noop} error="This handle is already taken.">
      <TextField label="New handle" name="handle" defaultValue="boris" />
    </SettingEditor>
  </div>
);

export const Danger = () => (
  <div style={{ maxWidth: 420 }}>
    <SettingEditor
      submitLabel="Send the deletion link"
      danger
      onSubmit={noop}
      onCancel={noop}
      note="The link expires in one hour. Your match history is anonymised, not erased."
    >
      <TextField label="Type your handle to confirm" name="confirm" />
    </SettingEditor>
  </div>
);
