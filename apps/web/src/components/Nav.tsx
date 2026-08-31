import { Link } from "react-router-dom";
import { Mark } from "./Mark";
import { Button } from "./Button";
import "./Nav.css";

export function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-brand" aria-label="Cursor Sync home">
          <Mark size="sm" />
        </Link>
        <nav className="nav-actions" aria-label="Primary">
          <Link to="/sign-in">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/sign-up">
            <Button variant="primary">Get started</Button>
          </Link>
        </nav>
      </div>
      <hr className="hairline nav-hairline" />
    </header>
  );
}
