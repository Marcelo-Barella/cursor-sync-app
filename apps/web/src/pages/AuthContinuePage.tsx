import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getMe, issueLoginCode, resendVerificationEmail } from "../lib/api";
import {
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
import { savePendingLoginCode } from "../lib/loginHandoff";
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
  const [emailVerified, setEmailVerified] = useState(true);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
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
      .then((me) => {
        setToken(sessionToken);
        setEmailVerified(me.emailVerified !== false);
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

  const issueCodeAndGoToCallback = useCallback(async () => {
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
      savePendingLoginCode(issued.code);
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
    void issueCodeAndGoToCallback();
  }, [state, busy, issueCodeAndGoToCallback]);

  const signInPath = authPathWithOAuthQuery("/sign-in", redirectUri, oauthState);

  async function handleResendVerification() {
    const sessionToken = token ?? readToken();
    if (!sessionToken) {
      return;
    }
    setResendBusy(true);
    setResendMessage(null);
    try {
      const result = await resendVerificationEmail(sessionToken);
      if (result.alreadyVerified) {
        setEmailVerified(true);
        setResendMessage("Your email is already verified.");
      } else if (result.sent) {
        setResendMessage("Verification email sent. Check your inbox.");
      } else {
        setResendMessage(
          result.warning ?? "Could not send verification email. Try again later."
        );
      }
    } catch {
      setResendMessage("Could not send verification email. Try again later.");
    } finally {
      setResendBusy(false);
    }
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
      {!emailVerified ? (
        <div className="auth-form-error-block" role="status">
          <p className="auth-form-error-muted">
            Verify your email address. We sent a link when you signed up.
          </p>
          {resendMessage ? (
            <p className="auth-card-sub">{resendMessage}</p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={resendBusy}
            onClick={() => {
              void handleResendVerification();
            }}
          >
            Resend verification email
          </Button>
        </div>
      ) : null}
      <div className="auth-card-header">
        <h1 className="auth-card-title">Continue in Cursor</h1>
        <p className="auth-card-body">
          You&apos;re signed in. Preparing your login code…
        </p>
      </div>
      <div className="auth-card-actions">
        <Button
          variant="primary"
          fullWidth
          loading={busy}
          onClick={() => {
            void issueCodeAndGoToCallback();
          }}
        >
          Continue in Cursor
        </Button>
        {handoffError ? (
          <p className="auth-card-sub" role="alert">
            {handoffError}
          </p>
        ) : null}
      </div>
    </AuthLayout>
  );
}
