const ALLOWED_AUTHORITY = "marcelobarella.cursor-sync";

function normalizeAuthPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function normalizeRedirectUri(uri: string): string | null {
  const trimmed = uri.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
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

export function isAllowedRedirectUri(uri: string): boolean {
  return normalizeRedirectUri(uri) !== null;
}

export function buildAuthCallbackRedirect(
  redirectUri: string,
  code: string,
  state?: string
): string {
  const normalized = normalizeRedirectUri(redirectUri) ?? redirectUri;
  const hashIndex = redirectUri.indexOf("#");
  const fragment = hashIndex === -1 ? "" : redirectUri.slice(hashIndex);
  const url = new URL(normalized);
  url.searchParams.set("code", code);
  if (state !== undefined && state !== "") {
    url.searchParams.set("state", state);
  }
  return `${url.toString()}${fragment}`;
}
