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

export function resolveCorsOrigin(requestOrigin: string | undefined): string | null {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  const patternsRaw = process.env.CORS_ALLOWED_ORIGIN_PATTERNS?.trim();

  if (!raw) {
    return requestOrigin ?? "*";
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
