export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.protocol !== "cursor:" || url.pathname !== "/auth") {
      return false;
    }
    return url.hostname.toLowerCase().endsWith(".cursor-sync");
  } catch {
    return false;
  }
}

export function appendCodeToRedirectUri(redirectUri: string, code: string): string {
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  return url.toString();
}
