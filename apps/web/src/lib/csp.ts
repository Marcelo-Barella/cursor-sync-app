export function parseApiOriginForCsp(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    if (url.protocol === "http:") {
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        return null;
      }
    }
    if (url.username || url.password) {
      return null;
    }
    const path = url.pathname.replace(/\/+$/, "");
    if (path !== "" && path !== "/") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(apiOrigin: string): string {
  const directives = [
    "default-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "worker-src 'self' blob:",
  ];
  return directives.join("; ");
}

export const REFERRER_POLICY = "strict-origin-when-cross-origin";

export const PERMISSIONS_POLICY =
  "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";