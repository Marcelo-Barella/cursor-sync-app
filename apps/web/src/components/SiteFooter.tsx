import { Link } from "react-router-dom";
import { useAuthOptional } from "../lib/authStore";
import { BUY_ME_A_COFFEE_URL } from "../lib/links";
import { getPublicSiteHost } from "../lib/site";
import "./SiteFooter.css";

function CoffeeGlyph() {
  return (
    <svg
      className="site-footer-coffee-glyph"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  );
}

export function SiteFooter() {
  const auth = useAuthOptional();
  const signedIn = Boolean(auth?.token);

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-start">
          <span className="site-footer-brand">Cursor Sync</span>
          <span className="site-footer-note">
            © {new Date().getFullYear()} Cursor Sync. Zero-knowledge cryptographic sync.
          </span>
          <span className="site-footer-domain">{getPublicSiteHost()}</span>
        </div>
        <nav className="site-footer-links" aria-label="Footer">
          <Link to="/changelog">Changelog</Link>
          {signedIn ? <Link to="/app">App</Link> : <Link to="/sign-in">Sign in</Link>}
          {import.meta.env.DEV ? <Link to="/developer">Developer</Link> : null}
          <a
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer-external"
          >
            <CoffeeGlyph />
            Buy me a coffee
          </a>
        </nav>
      </div>
    </footer>
  );
}
