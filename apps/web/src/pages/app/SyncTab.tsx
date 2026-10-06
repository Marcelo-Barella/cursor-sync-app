import { SettingsPanel } from "../../components/settings/SettingsPanel";

export function SyncTab() {
  return (
    <SettingsPanel
      title="Sync"
      lead="Your encrypted configuration syncs through the Cursor extension. Use the web app to manage your account and settings."
    />
  );
}
