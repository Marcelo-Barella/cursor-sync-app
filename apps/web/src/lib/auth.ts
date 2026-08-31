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
