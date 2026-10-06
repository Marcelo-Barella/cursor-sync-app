import { setStoredApiOverride } from "./apiBase";
import {
  HANDOFF_ATTEMPTED_KEY,
  OAUTH_REDIRECT_URI_KEY,
  OAUTH_STATE_KEY,
  TOKEN_STORAGE_KEY,
  clearToken,
} from "./auth";
import { clearE2eKeyCache } from "./e2eKeyCache";
import { PENDING_LOGIN_CODE_KEY } from "./loginHandoff";
import { requestServerLogout } from "./api";
import { clearMemorySession } from "./sessionAuth";
import { THEME_STORAGE_KEY } from "./theme";

const EMAIL_VERIFICATION_NOTICE_KEY = "cursor-sync:email-verification-notice";

export const AUTH_SESSION_STORAGE_KEYS = [
  TOKEN_STORAGE_KEY,
  OAUTH_REDIRECT_URI_KEY,
  OAUTH_STATE_KEY,
  HANDOFF_ATTEMPTED_KEY,
  PENDING_LOGIN_CODE_KEY,
  EMAIL_VERIFICATION_NOTICE_KEY,
] as const;

export const AUTH_COOKIE_NAMES: string[] = [];

export type LogoutNavigate = (path: string, options?: { replace?: boolean }) => void;

export type LogoutOptions = {
  redirectToLogin?: boolean;
  navigate?: LogoutNavigate;
};

export function clearAuthCookies(
  cookieNames: string[] = AUTH_COOKIE_NAMES,
  doc?: Document
): void {
  const documentRef =
    doc ?? (typeof document !== "undefined" ? document : undefined);
  if (!documentRef || cookieNames.length === 0) {
    return;
  }
  for (const name of cookieNames) {
    documentRef.cookie = `${name}=; Max-Age=0; path=/`;
    documentRef.cookie = `${name}=; Max-Age=0; path=/; domain=${documentRef.location.hostname}`;
  }
}

export function clearClientAuthState(storage?: {
  session: Storage;
  local: Storage;
}): void {
  const session = storage?.session ?? sessionStorage;
  const local = storage?.local ?? localStorage;

  for (const key of AUTH_SESSION_STORAGE_KEYS) {
    session.removeItem(key);
  }
  clearToken();
  setStoredApiOverride(null, local);
  clearMemorySession();
  clearAuthCookies();
  void clearE2eKeyCache();
}

export async function logout(options: LogoutOptions = {}): Promise<void> {
  const token =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(TOKEN_STORAGE_KEY)
      : null;

  void requestServerLogout(token);

  clearClientAuthState();

  if (!options.redirectToLogin) {
    return;
  }

  if (options.navigate) {
    options.navigate("/sign-in", { replace: true });
    return;
  }

  if (typeof window !== "undefined") {
    window.location.replace("/sign-in");
  }
}

export function isAuthStorageKey(key: string): boolean {
  return (AUTH_SESSION_STORAGE_KEYS as readonly string[]).includes(key);
}

export function isPreservedPreferenceKey(key: string): boolean {
  return key === THEME_STORAGE_KEY;
}
