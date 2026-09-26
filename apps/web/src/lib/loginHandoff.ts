export const PENDING_LOGIN_CODE_KEY = "cursor_sync_pending_login_code";

export function savePendingLoginCode(code: string): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(PENDING_LOGIN_CODE_KEY, code);
}

export function readPendingLoginCode(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const code = sessionStorage.getItem(PENDING_LOGIN_CODE_KEY);
  return code && code.trim() ? code.trim() : null;
}

export function clearPendingLoginCode(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.removeItem(PENDING_LOGIN_CODE_KEY);
}
