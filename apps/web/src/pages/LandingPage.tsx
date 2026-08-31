import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Mark } from "../components/Mark";
import "./LandingPage.css";

function FeatureIcon({ name }: { name: "travel" | "sync" | "signin" }) {
  if (name === "travel") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (name === "sync") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M17 7a5 5 0 0 0-8.5-3.6M7 17a5 5 0 0 0 8.5 3.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M17 3v4h-4M7 21v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v8M9 13l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LandingPage() {
  return (
    <div className="landing" data-page="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="Cursor Sync home">
            <Mark size="sm" />
            <span className="landing-brand-name">Cursor Sync</span>
          </Link>
          <nav className="landing-header-nav" aria-label="Primary">
            <Link to="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <a href="#install">
              <Button variant="primary">Install the extension</Button>
            </a>
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div data-hero-mark>
              <Mark size="lg" />
            </div>
            <h1 className="landing-display" data-hero-title>
              Your machines stay in sync.
            </h1>
            <p className="landing-hero-sub" data-hero-sub>
              Settings, rules, skills, keybindings travel with you. Sign in here.
              The extension does the rest.
            </p>
            <div className="landing-hero-cta" data-hero-cta>
              <a href="#install">
                <Button variant="primary">Install the extension</Button>
              </a>
              <Link to="/sign-in">
                <Button variant="ghost">Sign in</Button>
              </Link>
            </div>
          </div>

          <div className="landing-diagram" aria-hidden="true">
            <div className="landing-diagram-inner">
              <div className="landing-diagram-box landing-diagram-box--desk">Desk</div>
              <div className="landing-diagram-line" />
              <div className="landing-diagram-box landing-diagram-box--laptop">Laptop</div>
            </div>
          </div>
        </section>

        <section className="landing-features" data-section-features>
          <article className="landing-feature-card">
            <FeatureIcon name="travel" />
            <h2 className="landing-feature-title">Your setup travels</h2>
            <p className="landing-feature-body">
              Settings, rules, skills, and keybindings follow you seamlessly across
              devices.
            </p>
          </article>
          <article className="landing-feature-card">
            <FeatureIcon name="sync" />
            <h2 className="landing-feature-title">The extension does the work</h2>
            <p className="landing-feature-body">
              Push and pull live in the editor, not in this tab.
            </p>
          </article>
          <article className="landing-feature-card">
            <FeatureIcon name="signin" />
            <h2 className="landing-feature-title">This site signs you in</h2>
            <p className="landing-feature-body">
              Sign in here, then go back to Cursor.
            </p>
          </article>
        </section>

        <section className="landing-how" data-section-how>
          <h2 className="landing-section-title">How it works</h2>
          <ol className="landing-steps">
            <li className="landing-step" id="install">
              <span className="landing-step-number">1</span>
              <div className="landing-step-copy">
                <h3 className="landing-step-title">Install the extension</h3>
                <p className="landing-step-body">
                  Add Cursor Sync to your editor environment.
                </p>
              </div>
            </li>
            <li className="landing-step">
              <span className="landing-step-number">2</span>
              <div className="landing-step-copy">
                <h3 className="landing-step-title">Sign in on this site</h3>
                <p className="landing-step-body">Email and password on this site.</p>
              </div>
            </li>
            <li className="landing-step">
              <span className="landing-step-number">3</span>
              <div className="landing-step-copy">
                <h3 className="landing-step-title">
                  The extension keeps your machines aligned
                </h3>
                <p className="landing-step-body">
                  The extension keeps settings aligned across your machines.
                </p>
              </div>
            </li>
          </ol>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-brand">Cursor Sync</span>
          <span className="landing-footer-domain">sync.bergamota.dev</span>
        </div>
      </footer>
    </div>
  );
}
