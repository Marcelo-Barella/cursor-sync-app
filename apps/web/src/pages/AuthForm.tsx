import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { signIn, signUp } from "../lib/api";
import {
  authPathWithOAuthQuery,
  readOAuthState,
  resolveOAuthRedirectUri,
  saveOAuthParams,
  saveToken,
} from "../lib/auth";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
};

const SIGN_IN_ERROR = "Email or password is wrong";
const SIGN_UP_EMAIL_ERROR = "That email is already in use";

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const queryRedirectUri = searchParams.get("redirect_uri");
  const queryState = searchParams.get("state");
  const redirectUri = resolveOAuthRedirectUri(queryRedirectUri);
  const oauthState = queryState ?? readOAuthState();

  useEffect(() => {
    if (queryRedirectUri && !redirectUri) {
      setOauthError("This sign-in link is not valid. Open sign-in from the Cursor Sync extension.");
      return;
    }
    setOauthError(null);
    if (redirectUri) {
      saveOAuthParams(redirectUri, oauthState);
    }
  }, [queryRedirectUri, redirectUri, oauthState]);

  const isSignUp = mode === "sign-up";
  const page = isSignUp ? "sign-up" : "sign-in";
  const alternatePath = authPathWithOAuthQuery(
    isSignUp ? "/sign-in" : "/sign-up",
    redirectUri,
    oauthState
  );
  const continuePath = authPathWithOAuthQuery(
    "/auth/continue",
    redirectUri,
    oauthState
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setErrorField(null);

    if (oauthError) {
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      setErrorField("password");
      return;
    }

    setLoading(true);

    try {
      const auth = isSignUp
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);
      saveToken(auth.token);
      navigate(continuePath, { replace: true });
    } catch {
      if (isSignUp) {
        setError(SIGN_UP_EMAIL_ERROR);
        setErrorField("email");
      } else {
        setError(SIGN_IN_ERROR);
        setErrorField("password");
      }
    } finally {
      setLoading(false);
    }
  }

  if (oauthError) {
    return (
      <AuthLayout page={page}>
        <div className="auth-card-header">
          <h1 className="auth-card-title">{isSignUp ? "Create an account" : "Sign in"}</h1>
          <p className="auth-card-sub">{oauthError}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout page={page}>
      <div className="auth-card-header">
        <h1 className="auth-card-title">{isSignUp ? "Create an account" : "Sign in"}</h1>
        <p className="auth-card-sub">Opened from the Cursor Sync extension.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errorField === "email" ? error ?? undefined : undefined}
          disabled={loading}
          required
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errorField === "password" ? error ?? undefined : undefined}
          disabled={loading}
          minLength={8}
          required
        />
        {isSignUp ? (
          <Input
            label="Confirm password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={loading}
            minLength={8}
            required
          />
        ) : null}
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          {loading
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : "Continue in Cursor"}
        </Button>
      </form>

      <p className="auth-form-footer">
        {isSignUp ? (
          <>
            <Link to={alternatePath} className="auth-link">
              Sign in
            </Link>
          </>
        ) : (
          <>
            <Link to={alternatePath} className="auth-link">
              Create an account
            </Link>
          </>
        )}
      </p>
    </AuthLayout>
  );
}
