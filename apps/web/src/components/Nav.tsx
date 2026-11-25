import { Link, NavLink } from "react-router-dom";
import { useAuthOptional } from "../lib/authStore";
import { EXTENSION_LISTING_URL } from "../lib/defaults";
import "./Nav.css";

export function Nav() {
  const auth = useAuthOptional();
  const signedIn = Boolean(auth?.token);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-brand" aria-label="Cursor Sync home">
          <span className="signal-dot" aria-hidden="true" />
          <span>Cursor Sync</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link to="/#how-it-syncs" className="nav-link nav-link--story">
            How it syncs
          </Link>
          <NavLink to="/changelog" className="nav-link">
            Changelog
          </NavLink>
          {signedIn ? (
            <NavLink to="/app" className="nav-link">
              App
            </NavLink>
          ) : (
            <NavLink to="/sign-in" className="nav-link">
              Sign in
            </NavLink>
          )}
        </nav>
        <a href={EXTENSION_LISTING_URL} className="nav-install" target="_blank" rel="noreferrer">
          Install
        </a>
      </div>
    </header>
  );
}
