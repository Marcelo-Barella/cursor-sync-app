const WINDOW_MS = 60_000;
const LIMIT_PER_MINUTE = 60;

type BucketMap = Map<string, number[]>;

const ipBuckets: BucketMap = new Map();
const clientBuckets: BucketMap = new Map();

function pruneTimestamps(entries: number[], now: number): number[] {
  const cutoff = now - WINDOW_MS;
  return entries.filter((t) => t > cutoff);
}

function consumeSlot(map: BucketMap, key: string, now: number): boolean {
  const pruned = pruneTimestamps(map.get(key) ?? [], now);
  if (pruned.length >= LIMIT_PER_MINUTE) {
    map.set(key, pruned);
    return false;
  }
  pruned.push(now);
  map.set(key, pruned);
  return true;
}

export type TelemetryRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkTelemetryRateLimit(
  ip: string | null,
  clientId: string,
  now = Date.now()
): TelemetryRateLimitResult {
  if (ip !== null && !consumeSlot(ipBuckets, ip, now)) {
    return { allowed: false, retryAfterSeconds: 60 };
  }
  if (!consumeSlot(clientBuckets, clientId, now)) {
    return { allowed: false, retryAfterSeconds: 60 };
  }
  return { allowed: true };
}

export function resetTelemetryRateLimits(): void {
  ipBuckets.clear();
  clientBuckets.clear();
}