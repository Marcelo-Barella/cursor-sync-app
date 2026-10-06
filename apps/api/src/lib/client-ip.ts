import { isIP } from "node:net";

export function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n) || n < 0) {
    return 1;
  }
  return Math.floor(n);
}

export function normalizeIpAddress(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  let ip = value.trim();
  if (!ip) {
    return null;
  }
  if (ip.startsWith("::ffff:")) {
    ip = ip.slice("::ffff:".length);
  }
  return isIP(ip) ? ip : null;
}

export function clientIpFromForwarded(
  xForwardedFor: string | null | undefined,
  remoteAddress: string | null | undefined,
  hops = trustedProxyHops()
): string | null {
  const xff = xForwardedFor?.trim();
  if (xff) {
    const parts = xff.split(",").map((part) => part.trim()).filter(Boolean);
    const index = parts.length - 1 - hops;
    if (index >= 0 && index < parts.length) {
      const fromHeader = normalizeIpAddress(parts[index]);
      if (fromHeader) {
        return fromHeader;
      }
    }
  }
  return normalizeIpAddress(remoteAddress);
}
