import { Link } from "react-router-dom";
import { getPublicSiteHost } from "../lib/site";
import "./SiteFooter.css";

export function SiteFooter() {
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
          <Link to="/sign-in">Sign in</Link>
          <Link to="/developer">Developer</Link>
        </nav>
      </div>
    </footer>
  );
}
