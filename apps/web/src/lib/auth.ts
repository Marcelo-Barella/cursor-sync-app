export const EXTENSION_AUTH_URI = "cursor://MarceloBarella.cursor-sync/auth";

export function buildExtensionAuthUrl(token: string): string {
  const url = new URL(EXTENSION_AUTH_URI);
  url.searchParams.set("token", token);
  return url.toString();
}

export const TOKEN_STORAGE_KEY = "cursor_sync_session_token";

export function saveToken(token: string): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function readToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export const HANDOFF_ATTEMPTED_KEY = "cursor_sync_handoff_attempted";

export function attemptExtensionHandoff(token: string): void {
  sessionStorage.setItem(HANDOFF_ATTEMPTED_KEY, String(Date.now()));
  window.location.href = buildExtensionAuthUrl(token);
}

export function wasHandoffAttempted(): boolean {
  return sessionStorage.getItem(HANDOFF_ATTEMPTED_KEY) !== null;
}
