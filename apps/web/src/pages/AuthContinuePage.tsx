import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getMe, issueLoginCode } from "../lib/api";
import {
  attemptExtensionHandoff,
  authPathWithOAuthQuery,
  clearToken,
  readOAuthRedirectUri,
  readOAuthState,
  readOAuthStateFromSearchParams,
  readRedirectUriFromSearchParams,
  readToken,
  resolveOAuthRedirectUriForHandoff,
  saveOAuthParams,
} from "../lib/auth";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";

type ContinueState = "loading" | "ready" | "empty" | "error" | "invalid-link";

export function AuthContinuePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ContinueState>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const handoffStarted = useRef(false);

  const queryRedirectUri = readRedirectUriFromSearchParams(searchParams);
  const queryState = readOAuthStateFromSearchParams(searchParams);
  const oauthState = queryState ?? readOAuthState();
  const redirectUri = resolveOAuthRedirectUriForHandoff(queryRedirectUri);

  useEffect(() => {
    if (redirectUri) {
      saveOAuthParams(redirectUri, oauthState);
    }

    const sessionToken = readToken();
    if (!sessionToken) {
      setState("empty");
      return;
    }

    getMe(sessionToken)
      .then(() => {
        setToken(sessionToken);
        const handoffTarget = resolveOAuthRedirectUriForHandoff(queryRedirectUri);
        if (!handoffTarget) {
          setState("invalid-link");
          return;
        }
        setState("ready");
      })
      .catch(() => {
        clearToken();
        setState("error");
      });
  }, [queryRedirectUri, redirectUri, oauthState]);

  const callbackPath = authPathWithOAuthQuery("/auth/callback", redirectUri, oauthState);

  const performHandoff = useCallback(async () => {
    const sessionToken = token ?? readToken();
    const targetRedirectUri =
      resolveOAuthRedirectUriForHandoff(queryRedirectUri) ??
      readOAuthRedirectUri();
    const targetState = oauthState ?? readOAuthState();

    if (!sessionToken || !targetRedirectUri) {
      setHandoffError("Missing session or redirect information.");
      return;
    }

    setBusy(true);
    setHandoffError(null);

    try {
      const issued = await issueLoginCode(
        sessionToken,
        targetRedirectUri,
        targetState
      );
      attemptExtensionHandoff(
        targetRedirectUri,
        issued.code,
        issued.state ?? targetState
      );
      navigate(callbackPath, { replace: true });
    } catch {
      setHandoffError("Could not issue a sign-in code. Try again.");
    } finally {
      setBusy(false);
    }
  }, [token, queryRedirectUri, oauthState, navigate, callbackPath]);

  useEffect(() => {
    if (state !== "ready" || busy || handoffStarted.current) {
      return;
    }
    handoffStarted.current = true;
    void performHandoff();
  }, [state, busy, performHandoff]);

  const signInPath = authPathWithOAuthQuery("/sign-in", redirectUri, oauthState);

  if (state === "loading") {
    return (
      <AuthLayout page="continue" showMarkInCard>
        <div className="auth-loading-state" role="status" aria-live="polite">
          <div className="spinner" />
        </div>
      </AuthLayout>
    );
  }

  if (state === "invalid-link") {
    return (
      <AuthLayout page="continue" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Continue in Cursor</h1>
          <p className="auth-card-sub">
            Open sign-in from the Cursor Sync extension to continue.
          </p>
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
        <Link to={signInPath}>
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
        <Link to={signInPath}>
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
        <Button
          variant="primary"
          fullWidth
          loading={busy}
          onClick={() => {
            void performHandoff();
          }}
        >
          Continue in Cursor
        </Button>
        {handoffError ? (
          <p className="auth-card-sub" role="alert">
            {handoffError}
          </p>
        ) : null}
        <p className="auth-card-helper">You can safely close this window.</p>
      </div>
    </AuthLayout>
  );
}
