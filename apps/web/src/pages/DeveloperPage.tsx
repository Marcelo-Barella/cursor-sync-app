import { Link } from "react-router-dom";
import { Mark } from "../components/Mark";
import { SiteFooter } from "../components/SiteFooter";
import {
  isBuildTimeApiBaseConfigured,
  readBuildTimeApiUrl,
} from "../lib/apiBase";
import { useApiBaseUrl } from "../lib/useApiBaseUrl";
import "./DeveloperPage.css";

export function DeveloperPage() {
  const apiBase = useApiBaseUrl();
  const buildTimeApiUrl = readBuildTimeApiUrl();
  const buildTimeConfigured = isBuildTimeApiBaseConfigured();

  return (
    <div className="developer-page" data-page="developer">
      <header className="developer-header">
        <div className="developer-header-inner">
          <Link to="/" className="developer-brand" aria-label="Cursor Sync home">
            <Mark size="sm" />
            <span className="developer-brand-name">Cursor Sync</span>
          </Link>
        </div>
      </header>

      <main className="developer-main">
        <div className="developer-panel">
          <h1 className="developer-title">Developer</h1>
          <p className="developer-lead">
            API host used by this site. The target comes from build-time
            configuration or the default for the current mode; browser overrides
            are not supported.
          </p>

          <dl className="developer-meta">
            <div className="developer-meta-row">
              <dt>Active API target</dt>
              <dd className="developer-mono">{apiBase}</dd>
            </div>
            <div className="developer-meta-row">
              <dt>Build-time API URL (VITE_API_URL)</dt>
              <dd className="developer-mono">
                {buildTimeConfigured ? buildTimeApiUrl : "(not set — auth disabled)"}
              </dd>
            </div>
          </dl>

          <p className="developer-hint">
            When{" "}
            <code className="developer-inline-code">VITE_API_URL</code> is set at
            build time, all modes use that URL. In development without a build-time
            URL, the default local API preset is used. Browser-stored overrides are
            not applied.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}