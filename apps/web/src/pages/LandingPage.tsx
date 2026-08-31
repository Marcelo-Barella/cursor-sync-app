import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Mark } from "../components/Mark";
import { Nav } from "../components/Nav";

export function LandingPage() {
  return (
    <div className="page">
      <Nav />
      <main className="page-main">
        <section className="hero">
          <div className="hero-copy stack-lg">
            <Mark size="lg" />
            <h1 className="display">Your machines stay in sync.</h1>
            <p className="body">
              Settings, rules, skills, and keybindings travel with you. The site
              signs you in. The extension does the work.
            </p>
            <p className="muted">sync.bergamota.dev</p>
            <div className="cta-row">
              <Link to="/sign-up">
                <Button variant="primary">Get started</Button>
              </Link>
              <Link to="/sign-in">
                <Button variant="secondary">Sign in</Button>
              </Link>
            </div>
          </div>

          <aside className="hero-panel">
            <h2 className="title">How it works</h2>
            <ul className="feature-list">
              <li>Sign in here with email and password</li>
              <li>Return to Cursor and open the Cursor Sync extension</li>
              <li>The extension syncs your machines — not this website</li>
            </ul>
            <hr className="hairline" />
            <p className="muted">
              Cursor Sync keeps your Cursor configuration consistent across
              devices. Authentication happens on the web; syncing happens in the
              extension.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}
