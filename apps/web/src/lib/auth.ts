export const EXTENSION_AUTH_URI = "cursor://MarceloBarella.cursor-sync/auth";

const ALLOWED_AUTHORITY = "marcelobarella.cursor-sync";

export function isAllowedExtensionRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.pathname !== "/auth") {
      return false;
    }
    if (url.protocol !== "cursor:" && url.protocol !== "vscode:") {
      return false;
    }
    return url.hostname.toLowerCase() === ALLOWED_AUTHORITY;
  } catch {
    return false;
  }
}

export function buildExtensionAuthRedirectUrl(
  redirectUri: string,
  code: string,
  state?: string | null
): string {
  if (!isAllowedExtensionRedirectUri(redirectUri)) {
    throw new Error("Invalid redirect URI");
  }

  const hashIndex = redirectUri.indexOf("#");
  const base = hashIndex === -1 ? redirectUri : redirectUri.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : redirectUri.slice(hashIndex);
  const url = new URL(base);
  url.searchParams.set("code", code);
  if (state != null && state !== "") {
    url.searchParams.set("state", state);
  }

  const result = `${url.toString()}${fragment}`;
  if (/[?&]token=/i.test(result)) {
    throw new Error("Refusing to put session token in redirect URL");
  }
  return result;
}

export const TOKEN_STORAGE_KEY = "cursor_sync_session_token";
export const OAUTH_REDIRECT_URI_KEY = "cursor_sync_oauth_redirect_uri";
export const OAUTH_STATE_KEY = "cursor_sync_oauth_state";

export function saveToken(token: string): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function readToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function saveOAuthParams(redirectUri: string, state: string | null): void {
  sessionStorage.setItem(OAUTH_REDIRECT_URI_KEY, redirectUri);
  if (state != null && state !== "") {
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
  } else {
    sessionStorage.removeItem(OAUTH_STATE_KEY);
  }
}

export function readOAuthRedirectUri(): string | null {
  return sessionStorage.getItem(OAUTH_REDIRECT_URI_KEY);
}

export function readOAuthState(): string | null {
  return sessionStorage.getItem(OAUTH_STATE_KEY);
}

export function resolveOAuthRedirectUri(
  queryRedirectUri: string | null
): string | null {
  if (queryRedirectUri && isAllowedExtensionRedirectUri(queryRedirectUri)) {
    return queryRedirectUri;
  }
  const stored = readOAuthRedirectUri();
  if (stored && isAllowedExtensionRedirectUri(stored)) {
    return stored;
  }
  return null;
}

export function authPathWithOAuthQuery(
  path: string,
  redirectUri: string | null,
  state: string | null
): string {
  if (!redirectUri || !isAllowedExtensionRedirectUri(redirectUri)) {
    return path;
  }
  const params = new URLSearchParams({ redirect_uri: redirectUri });
  if (state != null && state !== "") {
    params.set("state", state);
  }
  return `${path}?${params.toString()}`;
}

export const HANDOFF_ATTEMPTED_KEY = "cursor_sync_handoff_attempted";

export function attemptExtensionHandoff(
  redirectUri: string,
  code: string,
  state?: string | null
): void {
  sessionStorage.setItem(HANDOFF_ATTEMPTED_KEY, String(Date.now()));
  window.location.href = buildExtensionAuthRedirectUrl(redirectUri, code, state);
}

export function wasHandoffAttempted(): boolean {
  return sessionStorage.getItem(HANDOFF_ATTEMPTED_KEY) !== null;
}
