import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../lib/api";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";

type VerifyState = "loading" | "success" | "error" | "missing";

export function AuthVerifyPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token")?.trim();
    if (!token) {
      setState("missing");
      return;
    }

    verifyEmail(token)
      .then(() => {
        setState("success");
      })
      .catch((error: unknown) => {
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "This verification link is invalid or has expired."
        );
      });
  }, [searchParams]);

  if (state === "loading") {
    return (
      <AuthLayout page="verify" showMarkInCard>
        <div className="auth-loading-state" role="status" aria-live="polite">
          <div className="spinner" />
          <p className="auth-card-sub">Verifying your email…</p>
        </div>
      </AuthLayout>
    );
  }

  if (state === "missing") {
    return (
      <AuthLayout page="verify" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Verify email</h1>
          <p className="auth-card-sub">No verification token was provided.</p>
        </div>
        <Link to="/sign-in">
          <Button variant="primary" fullWidth>Sign in</Button>
        </Link>
      </AuthLayout>
    );
  }

  if (state === "success") {
    return (
      <AuthLayout page="verify" showMarkInCard>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Email verified</h1>
          <p className="auth-card-sub">
            Your email address is confirmed. You can return to Cursor Sync and continue.
          </p>
        </div>
        <Link to="/sign-in">
          <Button variant="primary" fullWidth>Sign in</Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout page="verify" showMarkInCard>
      <div className="auth-card-header">
        <h1 className="auth-card-title">Verification failed</h1>
        <p className="auth-card-sub" role="alert">
          {message ?? "This verification link is invalid or has expired."}
        </p>
      </div>
      <Link to="/sign-in">
        <Button variant="primary" fullWidth>Sign in</Button>
      </Link>
    </AuthLayout>
  );
}
