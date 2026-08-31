import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMe } from "../lib/api";
import {
  buildExtensionAuthUrl,
  clearToken,
  readToken,
} from "../lib/auth";
import { Button } from "../components/Button";
import { Mark } from "../components/Mark";

type CallbackState = "loading" | "ready" | "error" | "empty";

export function AuthCallbackPage() {
  const [state, setState] = useState<CallbackState>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [extensionUrl, setExtensionUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = readToken();
    if (!token) {
      setState("empty");
      return;
    }

    setExtensionUrl(buildExtensionAuthUrl(token));

    getMe(token)
      .then((user) => {
        setEmail(user.email);
        setState("ready");
      })
      .catch(() => {
        clearToken();
        setState("error");
      });
  }, []);

  function handleReturnToCursor() {
    if (extensionUrl) {
      window.location.href = extensionUrl;
    }
  }

  return (
    <div className="page">
      <main className="page-main page-main--narrow">
        <div className="stack-xl">
          <Mark size="md" />

          <div className="auth-card stack-lg">
            {state === "loading" ? (
              <div className="loading-state" role="status" aria-live="polite">
                <div className="spinner" aria-hidden="true" />
                <p className="muted">Confirming your session…</p>
              </div>
            ) : null}

            {state === "empty" ? (
              <div className="stack">
                <h1 className="title">No active session</h1>
                <p className="muted">
                  Sign in first, then return here to connect the extension.
                </p>
                <Link to="/sign-in">
                  <Button variant="primary" fullWidth>
                    Sign in
                  </Button>
                </Link>
              </div>
            ) : null}

            {state === "error" ? (
              <div className="stack">
                <h1 className="title">Session expired</h1>
                <p className="muted">
                  Your sign-in could not be verified. Please try again.
                </p>
                <Link to="/sign-in">
                  <Button variant="primary" fullWidth>
                    Sign in again
                  </Button>
                </Link>
              </div>
            ) : null}

            {state === "ready" ? (
              <div className="stack-lg">
                <div className="stack">
                  <h1 className="title">You&apos;re signed in</h1>
                  {email ? <p className="muted">{email}</p> : null}
                  <p className="body">
                    Return to Cursor to finish connecting. The extension syncs
                    your machines — this site only handles sign-in.
                  </p>
                </div>

                <div className="callback-actions">
                  <Button variant="primary" fullWidth onClick={handleReturnToCursor}>
                    Return to Cursor
                  </Button>
                  <Button variant="secondary" fullWidth onClick={handleReturnToCursor}>
                    Continue in Cursor
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
