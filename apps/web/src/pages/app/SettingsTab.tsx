import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import {
  SettingsPanel,
  SettingsSection,
} from "../../components/settings/SettingsPanel";
import { useAuth } from "../../lib/authStore";

export function SettingsTab() {
  const navigate = useNavigate();
  const { email, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await logout({
        redirectToLogin: true,
        navigate: (path, options) => navigate(path, options),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsPanel
      title="Settings"
      lead="Account and session preferences for this browser."
    >
      <SettingsSection title="Account">
        <div className="settings-meta-row">
          <span className="settings-meta-label">Signed in as</span>
          <p className="settings-meta-value">{email ?? "—"}</p>
        </div>
      </SettingsSection>
      <SettingsSection title="Session">
        <p className="settings-lead">
          Log out on this device to clear your session and any unlocked encryption keys
          stored in this browser.
        </p>
        <div className="settings-actions">
          <Button
            type="button"
            variant="secondary"
            loading={busy}
            onClick={() => {
              void handleLogout();
            }}
          >
            Log out
          </Button>
        </div>
      </SettingsSection>
    </SettingsPanel>
  );
}
