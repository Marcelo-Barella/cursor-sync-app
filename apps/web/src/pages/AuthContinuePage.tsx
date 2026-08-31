import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../lib/api";
import {
  attemptExtensionHandoff,
  clearToken,
  readToken,
} from "../lib/auth";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";

type ContinueState = "loading" | "ready" | "empty" | "error";

export function AuthContinuePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<ContinueState>("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const sessionToken = readToken();
    if (!sessionToken) {
      setState("empty");
      return;
    }

    getMe(sessionToken)
      .then(() => {
        setToken(sessionToken);
        setState("ready");
      })
      .catch(() => {
        clearToken();
        setState("error");
      });
  }, []);

  function handleContinue() {
    if (!token) return;
    attemptExtensionHandoff(token);
    navigate("/auth/callback", { replace: true });
  }

  if (state === "loading") {
    return (
      <AuthLayout page="continue" showMarkInCard>
        <div className="auth-loading-state" role="status" aria-live="polite">
          <div className="spinner" />
        </div>
      </AuthLayout>
    );
  }

  if (state === "empty") {
    return (
      <AuthLayout page="continue" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Continue in Cursor</h1>
          <p className="auth-card-sub">Sign in first to continue.</p>
        </div>
        <Link to="/sign-in">
          <Button variant="primary" fullWidth>
            Sign in
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  if (state === "error") {
    return (
      <AuthLayout page="continue" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Continue in Cursor</h1>
          <p className="auth-card-sub">Your session could not be verified.</p>
        </div>
        <Link to="/sign-in">
          <Button variant="primary" fullWidth>
            Sign in again
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout page="continue" showMarkInCard>
      <div className="auth-card-header">
        <h1 className="auth-card-title">Continue in Cursor</h1>
        <p className="auth-card-body">
          You&apos;re signed in. Return to Cursor to finish.
        </p>
      </div>
      <div className="auth-card-actions">
        <Button variant="primary" fullWidth onClick={handleContinue}>
          Continue in Cursor
        </Button>
        <p className="auth-card-helper">You can safely close this window.</p>
      </div>
    </AuthLayout>
  );
}
