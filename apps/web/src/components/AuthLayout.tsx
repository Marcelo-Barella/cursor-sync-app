import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useExtensionChangelog } from "../lib/useExtensionChangelog";
import { Mark } from "./Mark";
import "./AuthLayout.css";

type AuthLayoutProps = {
  children: ReactNode;
  page: "sign-in" | "sign-up" | "continue" | "callback" | "verify";
  showMarkInCard?: boolean;
};

export function AuthLayout({ children, page, showMarkInCard = false }: AuthLayoutProps) {
  const changelogLoad = useExtensionChangelog();
  const latestVersion = changelogLoad.status === "ready" ? changelogLoad.changelog.latest : null;

  return (
    <div className="auth-page" data-page={page}>
      <header className="auth-header">
        <Link to="/" className="auth-header-brand" aria-label="Cursor Sync home">
          <Mark size="sm" />
          <span>Cursor Sync</span>
        </Link>
        {latestVersion ? <span className="auth-header-version mono">v{latestVersion}</span> : null}
      </header>
      <main className="auth-main">
        <div className="auth-card">
          {showMarkInCard ? (
            <div className="auth-card-mark">
              <Mark size="md" />
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
