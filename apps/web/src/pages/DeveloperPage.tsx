import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Mark } from "../components/Mark";
import { SiteFooter } from "../components/SiteFooter";
import {
  DEFAULT_LOCAL_API_BASE_URL,
  DEFAULT_PRODUCTION_API_BASE_URL,
} from "../lib/defaults";
import {
  getStoredApiOverride,
  normalizeApiBaseUrl,
  resolveApiBaseUrl,
  setStoredApiOverride,
} from "../lib/apiBase";
import { useApiBaseUrl } from "../lib/useApiBaseUrl";
import "./DeveloperPage.css";

export function DeveloperPage() {
  const apiBase = useApiBaseUrl();
  const [draft, setDraft] = useState(() => getStoredApiOverride() ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function applyOverride(url: string | null) {
    setStoredApiOverride(url);
    setDraft(url ?? "");
    setMessage(url ? "Override saved." : "Override cleared.");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeApiBaseUrl(draft);
    if (!normalized) {
      setMessage("Enter a valid http or https URL.");
      return;
    }
    applyOverride(normalized);
  }

  const effectiveWithoutOverride = resolveApiBaseUrl({
    storage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    },
  });

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
            Configure which API host this site calls. Overrides are stored in this
            browser only.
          </p>

          <dl className="developer-meta">
            <div className="developer-meta-row">
              <dt>Active API target</dt>
              <dd className="developer-mono">{apiBase}</dd>
            </div>
            <div className="developer-meta-row">
              <dt>Without override</dt>
              <dd className="developer-mono">{effectiveWithoutOverride}</dd>
            </div>
            <div className="developer-meta-row">
              <dt>Production default</dt>
              <dd className="developer-mono">{DEFAULT_PRODUCTION_API_BASE_URL}</dd>
            </div>
          </dl>

          <form className="developer-form" onSubmit={onSubmit}>
            <Input
              label="API base URL override"
              name="apiBase"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://api.example.com"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="developer-actions">
              <Button type="submit" variant="secondary">
                Save override
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => applyOverride(DEFAULT_LOCAL_API_BASE_URL)}
              >
                Local
              </Button>
              <Button type="button" variant="ghost" onClick={() => applyOverride(null)}>
                Clear override
              </Button>
            </div>
          </form>

          {message ? <p className="developer-message">{message}</p> : null}

          <p className="developer-hint">
            You can also set{" "}
            <code className="developer-inline-code">?api=&lt;url&gt;</code> in the
            address bar; a valid value is saved here automatically. Use{" "}
            <code className="developer-inline-code">?api=clear</code> to remove the
            stored override.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
