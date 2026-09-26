export function getPublicWebOrigin(): string | null {
  const raw = process.env.PUBLIC_WEB_ORIGIN ?? process.env.WEB_ORIGIN;
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  return raw.trim().replace(/\/+$/, "");
}

export function buildEmailVerificationLink(rawToken: string): string | null {
  const origin = getPublicWebOrigin();
  if (!origin) {
    return null;
  }
  const url = new URL("/auth/verify", origin);
  url.searchParams.set("token", rawToken);
  return url.toString();
}
