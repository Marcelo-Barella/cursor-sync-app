const ALLOWED_AUTHORITY = "marcelobarella.cursor-sync";

export function isAllowedRedirectUri(uri: string): boolean {
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

export function appendCodeToRedirectUri(
  redirectUri: string,
  code: string,
  state?: string
): string {
  return buildAuthCallbackRedirect(redirectUri, code, state);
}

export function buildAuthCallbackRedirect(
  redirectUri: string,
  code: string,
  state?: string
): string {
  const hashIndex = redirectUri.indexOf("#");
  const base = hashIndex === -1 ? redirectUri : redirectUri.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : redirectUri.slice(hashIndex);
  const url = new URL(base);
  url.searchParams.set("code", code);
  if (state !== undefined && state !== "") {
    url.searchParams.set("state", state);
  }
  return `${url.toString()}${fragment}`;
}
