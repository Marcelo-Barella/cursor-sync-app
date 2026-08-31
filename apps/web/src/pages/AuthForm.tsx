import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, signUp } from "../lib/api";
import { saveToken } from "../lib/auth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Mark } from "../components/Mark";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "sign-up";
  const title = isSignUp ? "Create your account" : "Sign in";
  const submitLabel = isSignUp ? "Create account" : "Sign in";
  const alternatePath = isSignUp ? "/sign-in" : "/sign-up";
  const alternatePrompt = isSignUp ? "Already have an account?" : "New to Cursor Sync?";
  const alternateLabel = isSignUp ? "Sign in" : "Create an account";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const auth = isSignUp
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);
      saveToken(auth.token);
      navigate("/auth/callback", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <main className="page-main page-main--narrow">
        <div className="stack-xl">
          <Link to="/" aria-label="Back to home">
            <Mark size="md" />
          </Link>

          <div className="auth-card stack-lg">
            <div className="stack">
              <h1 className="title">{title}</h1>
              <p className="muted">
                {isSignUp
                  ? "Create an account to connect the Cursor Sync extension."
                  : "Sign in to connect the Cursor Sync extension."}
              </p>
            </div>

            {loading ? (
              <div className="loading-state" role="status" aria-live="polite">
                <div className="spinner" aria-hidden="true" />
                <p className="muted">{isSignUp ? "Creating account…" : "Signing in…"}</p>
              </div>
            ) : (
              <form className="stack-lg" onSubmit={handleSubmit} noValidate>
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="email@domain.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
                {error ? (
                  <p className="error-text" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" variant="primary" fullWidth>
                  {submitLabel}
                </Button>
              </form>
            )}

            <p className="form-footer muted">
              {alternatePrompt}{" "}
              <Link to={alternatePath} className="link-muted">
                {alternateLabel}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
