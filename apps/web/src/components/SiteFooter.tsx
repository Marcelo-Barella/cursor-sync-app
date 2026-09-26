import { Link } from "react-router-dom";
import { useApiBaseUrl } from "../lib/useApiBaseUrl";
import { getPublicSiteHost } from "../lib/site";
import "./SiteFooter.css";

export function SiteFooter() {
  const apiBase = useApiBaseUrl();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-start">
          <span className="site-footer-brand">Cursor Sync</span>
          <span className="site-footer-domain">{getPublicSiteHost()}</span>
        </div>
        <div className="site-footer-end">
          <span className="site-footer-api" title="Current API target">
            API {apiBase}
          </span>
          <Link to="/developer" className="site-footer-developer">
            Developer
          </Link>
        </div>
      </div>
    </footer>
  );
}
