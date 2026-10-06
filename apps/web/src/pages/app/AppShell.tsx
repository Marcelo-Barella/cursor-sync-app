import { Link, NavLink, Outlet } from "react-router-dom";
import { Mark } from "../../components/Mark";
import { SiteFooter } from "../../components/SiteFooter";
import "./AppShell.css";

export function AppShell() {
  return (
    <div className="app-shell" data-page="app">
      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <Link to="/app" className="app-shell-brand" aria-label="Cursor Sync home">
            <Mark size="sm" />
            <span className="app-shell-brand-name">Cursor Sync</span>
          </Link>
          <nav className="app-shell-tabs" aria-label="App sections">
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                isActive ? "app-shell-tab app-shell-tab-active" : "app-shell-tab"
              }
            >
              Sync
            </NavLink>
            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                isActive ? "app-shell-tab app-shell-tab-active" : "app-shell-tab"
              }
            >
              Settings
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="app-shell-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
