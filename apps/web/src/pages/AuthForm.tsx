import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { signIn, signUp } from "../lib/api";
import { isAuthApiBaseMissing } from "../lib/apiBase";
import {
  AuthApiError,
  mapAuthApiError,
  messageForAuthErrorCategory,
  type MappedAuthFormError,
} from "../lib/authErrors";
import {
  authPathWithOAuthQuery,
  EXTENSION_AUTH_URI,
  readOAuthState,
  readOAuthStateFromSearchParams,
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

function emptyApiBaseFormError(): MappedAuthFormError {
  return mapAuthApiError(
    new AuthApiError(
      "empty_api_base",
      messageForAuthErrorCategory("empty_api_base")
    )
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<MappedAuthFormError | null>(() =>
    isAuthApiBaseMissing() ? emptyApiBaseFormError() : null
  );
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const rawRedirectQuery =
    searchParams.get("redirect_uri") ??
    searchParams.get("redirectUri") ??
    searchParams.get("redirect");
  const queryState = readOAuthStateFromSearchParams(searchParams);
  const redirectUri = resolveOAuthRedirectUri(rawRedirectQuery);
  const oauthState = queryState ?? readOAuthState();

  useEffect(() => {
    if (rawRedirectQuery?.trim() && !redirectUri) {
      setOauthError(
        "This sign-in link is not valid. Open sign-in from the Cursor Sync extension."
      );
      return;
    }
    setOauthError(null);
    if (redirectUri) {
      saveOAuthParams(redirectUri, oauthState);
    }
  }, [rawRedirectQuery, redirectUri, oauthState]);

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

  const apiBaseMissing = formError?.category === "empty_api_base";
  const primaryAction = formError?.primaryAction ?? "continue";
  const fieldMessage =
    formError?.field && formError.message ? formError.message : undefined;
  const inlineMessage =
    formError && formError.field === null ? formError.message : null;

  function handleReturnToCursor() {
    window.location.href = redirectUri ?? EXTENSION_AUTH_URI;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (oauthError || apiBaseMissing) {
      return;
    }

    if (isAuthApiBaseMissing()) {
      setFormError(emptyApiBaseFormError());
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setFormError({
        message: "Passwords do not match",
        field: "password",
        category: "validation_password",
        primaryAction: "continue",
        mutedHelper: null,
      });
      return;
    }

    setLoading(true);

    try {
      const auth = isSignUp
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);
      saveToken(auth.token);
      if (redirectUri) {
        saveOAuthParams(redirectUri, oauthState);
      }
      navigate(continuePath, { replace: true });
    } catch (caught) {
      setFormError(mapAuthApiError(caught));
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

  const submitLabel =
    loading
      ? isSignUp
        ? "Creating account…"
        : "Signing in…"
      : primaryAction === "try_again"
        ? "Try again"
        : "Continue in Cursor";

  return (
    <AuthLayout page={page}>
      <div className="auth-card-header">
        <h1 className="auth-card-title">{isSignUp ? "Create an account" : "Sign in"}</h1>
        <p className="auth-card-sub">
          {isSignUp
            ? "Opened from the Cursor Sync extension. We will email you a verification link after signup."
            : "Opened from the Cursor Sync extension."}
        </p>
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
          error={formError?.field === "email" ? fieldMessage : undefined}
          disabled={loading || apiBaseMissing}
          required
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={formError?.field === "password" ? fieldMessage : undefined}
          disabled={loading || apiBaseMissing}
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
            disabled={loading || apiBaseMissing}
            minLength={8}
            required
          />
        ) : null}
        {inlineMessage ? (
          <div className="auth-form-error-block" role="alert">
            <p className="auth-form-error">{inlineMessage}</p>
            {formError?.mutedHelper ? (
              <p className="auth-form-error-muted">{formError.mutedHelper}</p>
            ) : null}
          </div>
        ) : null}
        {primaryAction === "return_to_cursor" ? (
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={handleReturnToCursor}
          >
            Return to Cursor
          </Button>
        ) : (
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            {submitLabel}
          </Button>
        )}
      </form>

      <p className="auth-form-footer">
        {isSignUp ? (
          <Link to={alternatePath} className="auth-link">
            Sign in
          </Link>
        ) : (
          <Link to={alternatePath} className="auth-link">
            Create an account
          </Link>
        )}
      </p>
    </AuthLayout>
  );
}
