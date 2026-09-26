import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMe, issueLoginCode } from "../lib/api";
import {
  attemptExtensionHandoff,
  authPathWithOAuthQuery,
  clearToken,
  readOAuthRedirectUri,
  readOAuthState,
  readToken,
  readOAuthStateFromSearchParams,
  readRedirectUriFromSearchParams,
  resolveOAuthRedirectUriForHandoff,
  saveOAuthParams,
} from "../lib/auth";
import {
  clearPendingLoginCode,
  readPendingLoginCode,
  savePendingLoginCode,
} from "../lib/loginHandoff";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { LoginCodePanel } from "../components/LoginCodePanel";

type CallbackView =
  | "loading"
  | "return"
  | "missed"
  | "empty"
  | "error"
  | "code-error"
  | "invalid-link";

const HANDOFF_TIMEOUT_MS = 2500;

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<CallbackView>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const handoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeIssued = useRef(false);

  const queryRedirectUri = readRedirectUriFromSearchParams(searchParams);
  const queryState = readOAuthStateFromSearchParams(searchParams);
  const redirectUri = resolveOAuthRedirectUriForHandoff(queryRedirectUri);
  const oauthState = queryState ?? readOAuthState();

  const signInPath = authPathWithOAuthQuery("/sign-in", redirectUri, oauthState);

  const clearHandoffTimer = useCallback(() => {
    if (handoffTimer.current) {
      clearTimeout(handoffTimer.current);
      handoffTimer.current = null;
    }
  }, []);

  const ensureLoginCode = useCallback(
    async (sessionToken: string): Promise<string | null> => {
      const pending = readPendingLoginCode();
      if (pending) {
        setLoginCode(pending);
        return pending;
      }

      const targetRedirectUri =
        resolveOAuthRedirectUriForHandoff(queryRedirectUri) ?? readOAuthRedirectUri();
      const targetState = oauthState ?? readOAuthState();

      if (!targetRedirectUri) {
        return null;
      }

      try {
        const issued = await issueLoginCode(
          sessionToken,
          targetRedirectUri,
          targetState
        );
        savePendingLoginCode(issued.code);
        setLoginCode(issued.code);
        setCodeError(null);
        return issued.code;
      } catch {
        setCodeError("Could not load a login code. Try again.");
        return null;
      }
    },
    [queryRedirectUri, oauthState]
  );

  const runHandoff = useCallback(
    async (code: string, onMissed?: () => void) => {
      const targetRedirectUri =
        resolveOAuthRedirectUriForHandoff(queryRedirectUri) ?? readOAuthRedirectUri();
      const targetState = oauthState ?? readOAuthState();

      if (!targetRedirectUri) {
        setView("invalid-link");
        return;
      }

      setBusy(true);
      try {
        attemptExtensionHandoff(targetRedirectUri, code, targetState);
        clearHandoffTimer();
        handoffTimer.current = setTimeout(() => {
          if (!document.hidden) {
            onMissed?.();
          }
        }, HANDOFF_TIMEOUT_MS);
      } finally {
        setBusy(false);
      }
    },
    [queryRedirectUri, oauthState, clearHandoffTimer]
  );

  useEffect(() => {
    if (redirectUri) {
      saveOAuthParams(redirectUri, oauthState);
    }

    const sessionToken = readToken();
    if (!sessionToken) {
      setView("empty");
      return;
    }

    getMe(sessionToken)
      .then(async () => {
        setToken(sessionToken);
        const handoffTarget = resolveOAuthRedirectUriForHandoff(queryRedirectUri);
        if (!handoffTarget) {
          setView("invalid-link");
          return;
        }
        if (codeIssued.current) {
          return;
        }
        codeIssued.current = true;
        const code = await ensureLoginCode(sessionToken);
        if (!code) {
          setView("code-error");
          return;
        }
        setView("return");
      })
      .catch(() => {
        clearToken();
        setView("error");
      });

    return clearHandoffTimer;
  }, [queryRedirectUri, redirectUri, oauthState, clearHandoffTimer, ensureLoginCode]);

  function handleReturnToCursor() {
    if (!token || !loginCode) return;
    void runHandoff(loginCode, () => setView("missed"));
  }

  function handleRefreshCode() {
    if (!token) return;
    clearPendingLoginCode();
    codeIssued.current = false;
    setBusy(true);
    void ensureLoginCode(token)
      .then((code) => {
        if (code) {
          setView("return");
        } else {
          setView("code-error");
        }
      })
      .finally(() => setBusy(false));
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

  if (view === "invalid-link") {
    return (
      <AuthLayout page="callback" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Return to Cursor</h1>
          <p className="auth-card-sub">
            Open sign-in from the Cursor Sync extension to connect.
          </p>
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
        <Link to={signInPath}>
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
        <Link to={signInPath}>
          <Button variant="primary" fullWidth>
            Sign in again
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  if (view === "code-error") {
    return (
      <AuthLayout page="callback" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Return to Cursor</h1>
          <p className="auth-card-sub">
            {codeError ?? "Could not issue a sign-in code. Try again."}
          </p>
        </div>
        <Button variant="primary" fullWidth loading={busy} onClick={handleRefreshCode}>
          Try again
        </Button>
      </AuthLayout>
    );
  }

  if (view === "missed") {
    return (
      <AuthLayout page="callback" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Open Cursor yourself</h1>
          <p className="auth-card-body">
            We couldn&apos;t hand off automatically. Use the login code below or
            try Return to Cursor again.
          </p>
        </div>
        {loginCode ? <LoginCodePanel code={loginCode} /> : null}
        <div className="auth-card-actions">
          <Button
            variant="primary"
            fullWidth
            loading={busy}
            disabled={!loginCode}
            onClick={handleReturnToCursor}
          >
            Return to Cursor
          </Button>
          <Button type="button" variant="ghost" fullWidth onClick={handleRefreshCode}>
            Get a new code
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout page="callback" showMarkInCard>
      <div className="auth-card-header">
        <h1 className="auth-card-title">Return to Cursor</h1>
        <p className="auth-card-body">You&apos;re signed in. Return to Cursor to finish.</p>
      </div>
      {loginCode ? <LoginCodePanel code={loginCode} /> : null}
      {codeError ? (
        <p className="auth-card-sub" role="alert">
          {codeError}
        </p>
      ) : null}
      <div className="auth-card-actions">
        <Button
          variant="primary"
          fullWidth
          loading={busy}
          disabled={!loginCode}
          onClick={handleReturnToCursor}
        >
          Return to Cursor
        </Button>
        <p className="auth-card-helper">This tab can close after you connect in Cursor.</p>
      </div>
    </AuthLayout>
  );
}
