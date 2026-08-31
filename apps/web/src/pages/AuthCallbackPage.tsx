import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMe } from "../lib/api";
import {
  attemptExtensionHandoff,
  clearToken,
  readToken,
} from "../lib/auth";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";

type CallbackView = "loading" | "return" | "missed" | "empty" | "error";

const HANDOFF_TIMEOUT_MS = 2500;

export function AuthCallbackPage() {
  const [view, setView] = useState<CallbackView>("loading");
  const [token, setToken] = useState<string | null>(null);
  const handoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHandoffTimer = useCallback(() => {
    if (handoffTimer.current) {
      clearTimeout(handoffTimer.current);
      handoffTimer.current = null;
    }
  }, []);

  const tryHandoff = useCallback(
    (sessionToken: string, onMissed?: () => void) => {
      attemptExtensionHandoff(sessionToken);
      clearHandoffTimer();
      handoffTimer.current = setTimeout(() => {
        if (!document.hidden) {
          onMissed?.();
        }
      }, HANDOFF_TIMEOUT_MS);
    },
    [clearHandoffTimer]
  );

  useEffect(() => {
    const sessionToken = readToken();
    if (!sessionToken) {
      setView("empty");
      return;
    }

    getMe(sessionToken)
      .then(() => {
        setToken(sessionToken);
        setView("return");
      })
      .catch(() => {
        clearToken();
        setView("error");
      });

    return clearHandoffTimer;
  }, [clearHandoffTimer]);

  function handleReturnToCursor() {
    if (!token) return;
    tryHandoff(token, () => setView("missed"));
  }

  function handleTryAgain() {
    if (!token) return;
    tryHandoff(token);
  }

  if (view === "loading") {
    return (
      <AuthLayout page="callback" showMarkInCard>
        <div className="auth-loading-state" role="status" aria-live="polite">
          <div className="spinner" />
        </div>
      </AuthLayout>
    );
  }

  if (view === "empty") {
    return (
      <AuthLayout page="callback" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Return to Cursor</h1>
          <p className="auth-card-sub">Sign in first to connect the extension.</p>
        </div>
        <Link to="/sign-in">
          <Button variant="primary" fullWidth>
            Sign in
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  if (view === "error") {
    return (
      <AuthLayout page="callback" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Return to Cursor</h1>
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

  if (view === "missed") {
    return (
      <AuthLayout page="callback" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Open Cursor yourself</h1>
          <p className="auth-card-body">
            We couldn&apos;t hand off automatically. Open Cursor, then this tab
            can close.
          </p>
        </div>
        <Button variant="ghost" fullWidth onClick={handleTryAgain}>
          Try again
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout page="callback" showMarkInCard>
      <div className="auth-card-header">
        <h1 className="auth-card-title">Return to Cursor</h1>
        <p className="auth-card-body">This tab can close.</p>
      </div>
      <div className="auth-card-actions">
        <Button variant="primary" fullWidth onClick={handleReturnToCursor}>
          Return to Cursor
        </Button>
        <p className="auth-card-helper">
          If the app doesn&apos;t open automatically, click the button above.
        </p>
      </div>
    </AuthLayout>
  );
}
