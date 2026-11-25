export const API_ORIGIN_PRODUCTION = "https://api.cursor-sync.com";
export const API_ORIGIN_STAGING = "https://api-staging.cursor-sync.com";

export const VERCEL_HOST_STAGING = "staging.cursor-sync.com";
export const VERCEL_HOSTS_PRODUCTION = [
  "cursor-sync.com",
  "www.cursor-sync.com",
] as const;

export const STRICT_TRANSPORT_SECURITY =
  "max-age=63072000; includeSubDomains";

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

export function buildContentSecurityPolicy(
  apiOrigin: string,
  options: { includeFrameAncestors?: boolean } = {}
): string {
  const includeFrameAncestors = options.includeFrameAncestors !== false;
  const directives = [
    "default-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "base-uri 'self'",
    "form-action 'self'",
    ...(includeFrameAncestors ? (["frame-ancestors 'none'"] as const) : []),
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "worker-src 'self' blob:",
  ];
  return directives.join("; ");
}

export function buildMetaContentSecurityPolicyValue(): string {
  return buildContentSecurityPolicy(
    `${API_ORIGIN_PRODUCTION} ${API_ORIGIN_STAGING}`,
    { includeFrameAncestors: false }
  );
}

export const REFERRER_POLICY = "strict-origin-when-cross-origin";

export const PERMISSIONS_POLICY =
  "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

export type VercelHeaderPair = { key: string; value: string };

export function buildVercelSecurityHeaderPairs(csp: string): VercelHeaderPair[] {
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: REFERRER_POLICY },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    {
      key: "Strict-Transport-Security",
      value: STRICT_TRANSPORT_SECURITY,
    },
  ];
}

export function parseConnectSrcOrigins(csp: string): string[] {
  const match = csp.match(/connect-src\s+([^;]+)/);
  if (!match) {
    return [];
  }
  return match[1]
    .trim()
    .split(/\s+/)
    .filter((token) => token !== "'self'");
}