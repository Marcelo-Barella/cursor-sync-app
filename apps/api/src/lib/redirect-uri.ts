const ALLOWED_HOST =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cursor-sync$/i;

export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.protocol !== "cursor:" || url.pathname !== "/auth") {
      return false;
    }
    return ALLOWED_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

export function appendCodeToRedirectUri(redirectUri: string, code: string): string {
  const hashIndex = redirectUri.indexOf("#");
  const base = hashIndex === -1 ? redirectUri : redirectUri.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : redirectUri.slice(hashIndex);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}code=${encodeURIComponent(code)}${fragment}`;
}
