export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === "cursor:" && url.pathname === "/auth";
  } catch {
    return false;
  }
}

export function appendCodeToRedirectUri(redirectUri: string, code: string): string {
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  return url.toString();
}
