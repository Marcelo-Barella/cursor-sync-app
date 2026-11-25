export const DEFAULT_TELEMETRY_EVENT_ALLOWLIST = [
  "page_view",
  "session_start",
  "cta_click",
  "sign_up",
  "login",
  "error",
] as const;

export function resolveTelemetryEventAllowlist(): Set<string> {
  const raw = process.env.TELEMETRY_EVENT_ALLOWLIST?.trim();
  if (!raw) {
    return new Set(DEFAULT_TELEMETRY_EVENT_ALLOWLIST);
  }
  const names = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return new Set(names);
}