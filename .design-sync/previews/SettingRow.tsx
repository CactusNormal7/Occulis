import { SettingEditor, SettingList, SettingRow, TextField } from "@occulis/ui";

const noop = () => undefined;

export const ReadOnly = () => (
  <div style={{ maxWidth: 480 }}>
    <SettingList>
      <SettingRow label="Handle" value="Cactus" description="Visible to your opponents. Once every 30 days." onEdit={noop} />
    </SettingList>
  </div>
);

export const EditDisabled = () => (
  <div style={{ maxWidth: 480 }}>
    <SettingList>
      <SettingRow label="Handle" value="Cactus" description="Changeable again on 11 November." onEdit={noop} editDisabled />
    </SettingList>
  </div>
);

export const Editing = () => (
  <div style={{ maxWidth: 480 }}>
    <SettingList>
      <SettingRow label="Handle" value="Cactus" onEdit={noop} editing>
        <SettingEditor submitLabel="Save" onSubmit={noop} onCancel={noop}>
          <TextField label="New handle" name="handle" defaultValue="Cactus" />
        </SettingEditor>
      </SettingRow>
    </SettingList>
  </div>
);
