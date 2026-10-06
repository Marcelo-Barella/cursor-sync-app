import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMe } from "./api";
import { readToken, saveToken } from "./auth";
import { logout as runLogout, type LogoutNavigate } from "./logout";
import {
  AUTH_STATE_CHANGED_EVENT,
  clearMemorySession,
  setMemorySession,
  syncMemorySessionFromStorage,
} from "./sessionAuth";

export type AuthContextValue = {
  token: string | null;
  email: string | null;
  loading: boolean;
  setSession: (token: string, email?: string | null) => void;
  logout: (options?: { redirectToLogin?: boolean; navigate?: LogoutNavigate }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken());
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => readToken() !== null);

  const refreshFromStorage = useCallback(() => {
    const stored = readToken();
    setToken(stored);
    if (!stored) {
      setEmail(null);
      clearMemorySession();
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = readToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getMe(stored)
      .then((me) => {
        setToken(stored);
        setEmail(me.email);
        setMemorySession(stored, me.email);
      })
      .catch(() => {
        void runLogout({ redirectToLogin: false });
        setToken(null);
        setEmail(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const onAuthChanged = () => refreshFromStorage();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_STATE_CHANGED_EVENT, onAuthChanged);
  }, [refreshFromStorage]);

  const setSession = useCallback((nextToken: string, nextEmail?: string | null) => {
    saveToken(nextToken);
    setToken(nextToken);
    setEmail(nextEmail ?? null);
    setMemorySession(nextToken, nextEmail ?? null);
    setLoading(false);
  }, []);

  const logout = useCallback(
    async (options?: { redirectToLogin?: boolean; navigate?: LogoutNavigate }) => {
      await runLogout(options);
      setToken(null);
      setEmail(null);
    },
    []
  );

  const value = useMemo(
    () => ({
      token,
      email,
      loading,
      setSession,
      logout,
    }),
    [token, email, loading, setSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function bootstrapAuthFromStorage(): void {
  syncMemorySessionFromStorage();
}
