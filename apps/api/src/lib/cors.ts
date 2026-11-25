function parseHttpsOrigin(origin: string): URL | null {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") {
      return null;
    }
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function originMatchesAllowedPattern(origin: string, pattern: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed.startsWith("*")) {
    return false;
  }

  const suffix = trimmed.slice(1);
  if (!suffix || suffix.includes("*")) {
    return false;
  }

  const url = parseHttpsOrigin(origin);
  if (!url) {
    return false;
  }

  const host = url.hostname;
  if (!host.endsWith(suffix) || host.length <= suffix.length) {
    return false;
  }

  const prefix = host.slice(0, host.length - suffix.length);
  if (!prefix || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(prefix)) {
    return false;
  }

  return true;
}

function matchesAnyOriginPattern(origin: string, patternsRaw: string): boolean {
  const patterns = patternsRaw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return patterns.some((pattern) => originMatchesAllowedPattern(origin, pattern));
}

const CORS_REJECT_WARN_INTERVAL_MS = 60_000;
let lastCorsRejectWarnAt = 0;

export function isCorsAllowlistConfigured(): boolean {
  return Boolean(process.env.CORS_ALLOWED_ORIGINS?.trim());
}

function isLoopbackHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "[::1]") {
    return true;
  }
  if (hostname === "127.0.0.1") {
    return true;
  }
  return /^127(?:\.\d{1,3}){3}$/.test(hostname);
}

export function findInsecureHttpCorsOriginsInProduction(
  env: NodeJS.ProcessEnv = process.env
): string[] {
  if (env.NODE_ENV !== "production") {
    return [];
  }
  const raw = env.CORS_ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return [];
  }
  const insecure: string[] = [];
  for (const entry of raw.split(",")) {
    const origin = entry.trim();
    if (!origin) {
      continue;
    }
    try {
      const url = new URL(origin);
      if (url.protocol === "http:" && !isLoopbackHost(url.hostname)) {
        insecure.push(origin);
      }
    } catch {
      continue;
    }
  }
  return insecure;
}

export function logCorsStartup(): void {
  if (!isCorsAllowlistConfigured()) {
    console.error(
      "CORS_ALLOWED_ORIGINS is unset or empty: cross-origin browser access is denied (fail closed)"
    );
  }
  const insecure = findInsecureHttpCorsOriginsInProduction();
  if (insecure.length > 0) {
    console.error(
      `CORS_ALLOWED_ORIGINS in production includes non-HTTPS origins (non-loopback): ${insecure.join(", ")}`
    );
  }
}

function warnCorsOriginRejectedUnsetAllowlist(origin: string): void {
  const now = Date.now();
  if (now - lastCorsRejectWarnAt < CORS_REJECT_WARN_INTERVAL_MS) {
    return;
  }
  lastCorsRejectWarnAt = now;
  console.warn(
    `CORS rejected Origin ${origin} because CORS_ALLOWED_ORIGINS is unset or empty`
  );
}

export function resetCorsRejectWarnForTests(): void {
  lastCorsRejectWarnAt = 0;
}

export function resolveCorsOrigin(requestOrigin: string | undefined): string | null {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  const patternsRaw = process.env.CORS_ALLOWED_ORIGIN_PATTERNS?.trim();

  if (!raw) {
    if (requestOrigin) {
      warnCorsOriginRejectedUnsetAllowlist(requestOrigin);
    }
    return null;
  }

  const allowed = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!requestOrigin) {
    return allowed[0] ?? null;
  }

  if (allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  if (patternsRaw && matchesAnyOriginPattern(requestOrigin, patternsRaw)) {
    return requestOrigin;
  }

  return null;
}
