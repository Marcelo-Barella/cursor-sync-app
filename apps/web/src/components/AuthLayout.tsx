import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Mark } from "./Mark";
import "./AuthLayout.css";

type AuthLayoutProps = {
  children: ReactNode;
  page: "sign-in" | "sign-up" | "continue" | "callback";
  showMarkInCard?: boolean;
};

export function AuthLayout({ children, page, showMarkInCard = false }: AuthLayoutProps) {
  return (
    <div className="auth-page" data-page={page}>
      <header className="auth-header">
        <Link to="/" className="auth-header-brand" aria-label="Cursor Sync home">
          <Mark size="sm" />
          <span>Cursor Sync</span>
        </Link>
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
