import { Button, SettingList, SettingRow } from "@occulis/ui";

const noop = () => undefined;

export const Account = () => (
  <div style={{ maxWidth: 480 }}>
    <SettingList>
      <SettingRow label="Handle" value="Cactus" description="Visible to your opponents. Once every 30 days." onEdit={noop} />
      <SettingRow label="Email address" value="anne@occulis.test" description="Verified." onEdit={noop} />
      <SettingRow label="Password" value="••••••••••" editLabel="Change" onEdit={noop} />
      <SettingRow label="Google" value="Not linked" action={<Button size="sm">Link</Button>} />
    </SettingList>
  </div>
);
