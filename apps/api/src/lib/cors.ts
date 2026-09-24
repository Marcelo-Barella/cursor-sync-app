export function resolveCorsOrigin(requestOrigin: string | undefined): string | null {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
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

  return allowed.includes(requestOrigin) ? requestOrigin : null;
}
