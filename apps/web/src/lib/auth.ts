export const EXTENSION_AUTH_URI = "cursor://MarceloBarella.cursor-sync/auth";

const ALLOWED_AUTHORITY = "marcelobarella.cursor-sync";

function normalizeAuthPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function normalizeExtensionRedirectUri(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  let candidate = trimmed;
  if (candidate.includes("%")) {
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      candidate = trimmed;
    }
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== "cursor:" && url.protocol !== "vscode:") {
      return null;
    }
    if (normalizeAuthPath(url.pathname) !== "/auth") {
      return null;
    }
    if (url.hostname.toLowerCase() !== ALLOWED_AUTHORITY) {
      return null;
    }
    return `${url.protocol}//${url.hostname.toLowerCase()}/auth`;
  } catch {
    return null;
  }
}

export function readRedirectUriFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): string | null {
  const raw =
    searchParams.get("redirect_uri") ??
    searchParams.get("redirectUri") ??
    searchParams.get("redirect");
  if (!raw) {
    return null;
  }
  return normalizeExtensionRedirectUri(raw);
}

export function readOAuthStateFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): string | null {
  return searchParams.get("state") ?? searchParams.get("oauth_state");
}

export function buildExtensionAuthRedirectUrl(
  redirectUri: string,
  code: string,
  state?: string | null
): string {
  if (/[?&]token=/i.test(redirectUri)) {
    throw new Error("Refusing to put session token in redirect URL");
  }
  const normalized = normalizeExtensionRedirectUri(redirectUri);
  if (!normalized) {
    throw new Error("Invalid redirect URI");
  }

  const hashIndex = redirectUri.indexOf("#");
  const fragment = hashIndex === -1 ? "" : redirectUri.slice(hashIndex);
  const url = new URL(normalized);
  url.searchParams.set("code", code);
  if (state != null && state !== "") {
    url.searchParams.set("state", state);
  }

  return `${url.toString()}${fragment}`;
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
  if (typeof sessionStorage === "undefined") {
    return;
  }
  const normalized = normalizeExtensionRedirectUri(redirectUri);
  if (!normalized) {
    return;
  }
  sessionStorage.setItem(OAUTH_REDIRECT_URI_KEY, normalized);
  if (state != null && state !== "") {
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
  } else {
    sessionStorage.removeItem(OAUTH_STATE_KEY);
  }
}

export function readOAuthRedirectUri(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const stored = sessionStorage.getItem(OAUTH_REDIRECT_URI_KEY);
  if (!stored) {
    return null;
  }
  return normalizeExtensionRedirectUri(stored);
}

export function readOAuthState(): string | null {
  return sessionStorage.getItem(OAUTH_STATE_KEY);
}

export function resolveOAuthRedirectUri(
  queryRedirectUri: string | null
): string | null {
  if (queryRedirectUri) {
    const fromQuery = normalizeExtensionRedirectUri(queryRedirectUri);
    if (fromQuery) {
      return fromQuery;
    }
  }
  return readOAuthRedirectUri();
}

export function resolveOAuthRedirectUriForHandoff(
  queryRedirectUri: string | null
): string {
  return (
    resolveOAuthRedirectUri(queryRedirectUri) ??
    normalizeExtensionRedirectUri(EXTENSION_AUTH_URI) ??
    "cursor://marcelobarella.cursor-sync/auth"
  );
}

export function authPathWithOAuthQuery(
  path: string,
  redirectUri: string | null,
  state: string | null
): string {
  const normalized = redirectUri
    ? normalizeExtensionRedirectUri(redirectUri)
    : null;
  if (!normalized) {
    return path;
  }
  const params = new URLSearchParams({ redirect_uri: normalized });
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
