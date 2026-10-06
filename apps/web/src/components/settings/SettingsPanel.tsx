import type { ReactNode } from "react";
import "./SettingsPanel.css";

type SettingsPanelProps = {
  title: string;
  lead?: string;
  children?: ReactNode;
};

export function SettingsPanel({ title, lead, children }: SettingsPanelProps) {
  return (
    <section className="settings-panel" aria-labelledby="settings-panel-title">
      <h1 id="settings-panel-title" className="settings-title">{title}</h1>
      {lead ? <p className="settings-lead">{lead}</p> : null}
      {children}
    </section>
  );
}

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="settings-section">
      <h2 className="settings-section-title">{title}</h2>
      {children}
    </div>
  );
}
