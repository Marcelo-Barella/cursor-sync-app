import { Navigate, Outlet, useLocation } from "react-router-dom";
import { readToken } from "../lib/auth";
import { useAuth } from "../lib/authStore";

export function RequireAuth() {
  const { token, loading } = useAuth();
  const location = useLocation();
  const storedToken = readToken();
  const authed = Boolean(token ?? storedToken);

  if (loading && storedToken) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <div className="spinner" />
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
