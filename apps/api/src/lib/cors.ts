const CORS_REJECT_WARN_INTERVAL_MS = 60_000;
let lastCorsRejectWarnAt = 0;

export type CorsAllowlistParseResult =
  | { ok: true; origin: string }
  | { ok: false; reason: string };

function isLoopbackHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "[::1]") {
    return true;
  }
  if (hostname === "127.0.0.1") {
    return true;
  }
  return /^127(?:\.\d{1,3}){3}$/.test(hostname);
}

function parseOriginLike(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("*")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.username || url.password || url.search || url.hash) {
    return null;
  }

  const path = url.pathname;
  if (path !== "" && path !== "/") {
    return null;
  }

  if (url.protocol === "https:") {
    return url;
  }

  if (url.protocol === "http:" && isLoopbackHost(url.hostname)) {
    return url;
  }

  return null;
}

export function parseCorsAllowlistEntry(entry: string): CorsAllowlistParseResult {
  const trimmed = entry.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty entry" };
  }
  if (trimmed.includes("*")) {
    return { ok: false, reason: "wildcards are not allowed" };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: "invalid origin URL" };
  }

  if (url.username || url.password || url.search || url.hash) {
    return { ok: false, reason: "origin must not include userinfo, query, or fragment" };
  }

  if (url.pathname !== "" && url.pathname !== "/") {
    return { ok: false, reason: "origin must not include a path" };
  }

  if (url.protocol === "https:") {
    return { ok: true, origin: url.origin };
  }

  if (url.protocol === "http:" && isLoopbackHost(url.hostname)) {
    return { ok: true, origin: url.origin };
  }

  return {
    ok: false,
    reason: "origin must be https, or http only for localhost or 127.0.0.1",
  };
}

export function parseCorsAllowedOrigins(raw: string): {
  allowed: string[];
  rejected: Array<{ entry: string; reason: string }>;
} {
  const allowed: string[] = [];
  const rejected: Array<{ entry: string; reason: string }> = [];

  for (const entry of raw.split(",")) {
    const parsed = parseCorsAllowlistEntry(entry);
    if (parsed.ok) {
      if (!allowed.includes(parsed.origin)) {
        allowed.push(parsed.origin);
      }
    } else {
      rejected.push({ entry: entry.trim(), reason: parsed.reason });
    }
  }

  return { allowed, rejected };
}

export function isCorsAllowlistConfigured(): boolean {
  return parseCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS ?? "").allowed.length > 0;
}

function getAllowedOriginsFromEnv(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return [];
  }
  return parseCorsAllowedOrigins(raw).allowed;
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
  const { allowed } = parseCorsAllowedOrigins(raw);
  const insecure: string[] = [];
  for (const origin of allowed) {
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
  const patternsRaw = process.env.CORS_ALLOWED_ORIGIN_PATTERNS?.trim();
  if (patternsRaw) {
    console.warn(
      "CORS_ALLOWED_ORIGIN_PATTERNS is set but ignored; use exact origins in CORS_ALLOWED_ORIGINS only"
    );
  }

  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (!raw) {
    console.error(
      "CORS_ALLOWED_ORIGINS is unset or empty: cross-origin browser access is denied (fail closed)"
    );
    return;
  }

  const { rejected } = parseCorsAllowedOrigins(raw);
  for (const { entry, reason } of rejected) {
    console.error(`CORS_ALLOWED_ORIGINS rejected entry "${entry}": ${reason}`);
  }

  if (parseCorsAllowedOrigins(raw).allowed.length === 0) {
    console.error(
      "CORS_ALLOWED_ORIGINS has no valid entries: cross-origin browser access is denied (fail closed)"
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
  const allowed = getAllowedOriginsFromEnv();

  if (allowed.length === 0) {
    if (requestOrigin) {
      warnCorsOriginRejectedUnsetAllowlist(requestOrigin);
    }
    return null;
  }

  if (!requestOrigin) {
    return allowed[0] ?? null;
  }

  const requestUrl = parseOriginLike(requestOrigin);
  if (!requestUrl) {
    return null;
  }

  if (allowed.includes(requestUrl.origin)) {
    return requestUrl.origin;
  }

  return null;
}