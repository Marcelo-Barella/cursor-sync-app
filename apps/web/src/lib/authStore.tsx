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
import {
  broadcastAuthLogin,
  subscribeToAuthSync,
  redirectAfterRemoteLogout,
} from "./authSync";
import {
  applyRemoteLogout,
  logout as runLogout,
  type LogoutNavigate,
} from "./logout";
import {
  AUTH_STATE_CHANGED_EVENT,
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

export function syncReactAuthFromStorage(setters: {
  setToken: (token: string | null) => void;
  setEmail: (email: string | null) => void;
  setLoading: (loading: boolean) => void;
}): void {
  const stored = readToken();
  setters.setToken(stored);
  if (!stored) {
    setters.setEmail(null);
    setters.setLoading(false);
  }
  syncMemorySessionFromStorage();
}

export async function bootstrapAuthFromStoredToken(options: {
  token: string | null;
  loadProfile: (token: string) => Promise<{ email: string }>;
  onAuthenticated: (email: string) => void;
  onSessionInvalid: () => void | Promise<void>;
}): Promise<"authenticated" | "cleared" | "no_token"> {
  if (!options.token) {
    return "no_token";
  }
  try {
    const me = await options.loadProfile(options.token);
    setMemorySession(options.token, me.email);
    options.onAuthenticated(me.email);
    return "authenticated";
  } catch {
    await options.onSessionInvalid();
    return "cleared";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken());
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => readToken() !== null);

  const refreshFromStorage = useCallback(() => {
    syncReactAuthFromStorage({ setToken, setEmail, setLoading });
  }, []);

  useEffect(() => {
    const stored = readToken();
    if (!stored) {
      setLoading(false);
      syncMemorySessionFromStorage();
      return;
    }
    setLoading(true);
    let cancelled = false;
    getMe(stored)
      .then((me) => {
        if (cancelled) {
          return;
        }
        setToken(stored);
        setEmail(me.email);
        setMemorySession(stored, me.email);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        void runLogout({ redirectToLogin: false }).then(() => {
          if (!cancelled) {
            setToken(null);
            setEmail(null);
          }
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemoteLogout = useCallback(() => {
    const hadSession = readToken() !== null;
    applyRemoteLogout();
    setToken(null);
    setEmail(null);
    setLoading(false);
    if (hadSession) {
      redirectAfterRemoteLogout();
    }
  }, []);

  useEffect(() => {
    const onAuthChanged = () => refreshFromStorage();
    const unsubscribe = subscribeToAuthSync((message) => {
      if (message.type === "logout") {
        handleRemoteLogout();
        return;
      }
      refreshFromStorage();
    });
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, onAuthChanged);
    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, onAuthChanged);
      unsubscribe();
    };
  }, [refreshFromStorage, handleRemoteLogout]);

  const setSession = useCallback((nextToken: string, nextEmail?: string | null) => {
    saveToken(nextToken);
    setToken(nextToken);
    setEmail(nextEmail ?? null);
    setMemorySession(nextToken, nextEmail ?? null);
    setLoading(false);
    broadcastAuthLogin();
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