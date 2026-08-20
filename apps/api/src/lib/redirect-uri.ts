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
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  return url.toString();
}
