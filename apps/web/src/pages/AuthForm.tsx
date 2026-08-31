import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, signUp } from "../lib/api";
import { saveToken } from "../lib/auth";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "sign-up";
  const page = isSignUp ? "sign-up" : "sign-in";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setErrorField(null);

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
      navigate("/auth/continue", { replace: true });
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
            <Link to="/sign-in" className="auth-link">
              Sign in
            </Link>
          </>
        ) : (
          <>
            <Link to="/sign-up" className="auth-link">
              Create an account
            </Link>
          </>
        )}
      </p>
    </AuthLayout>
  );
}
