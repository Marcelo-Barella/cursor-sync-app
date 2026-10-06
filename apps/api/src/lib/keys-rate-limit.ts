import type { Pool } from "pg";

const WINDOW_MS = 15 * 60 * 1000;

export const KEY_FETCH_STATUS = {
  OK: 200,
  NOT_SET: 404,
  RATE_LIMITED: 429,
} as const;

function limitPerUser(): number {
  const raw = process.env.KEY_FETCH_LIMIT_PER_USER;
  const n = raw ? Number.parseInt(raw, 10) : 10;
  return Number.isFinite(n) && n > 0 ? n : 10;
}

function limitPerIp(): number {
  const raw = process.env.KEY_FETCH_LIMIT_PER_IP;
  const n = raw ? Number.parseInt(raw, 10) : 30;
  return Number.isFinite(n) && n > 0 ? n : 30;
}

export function clientIpFromRequest(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return null;
}

export type KeyFetchRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function checkKeyFetchRateLimit(
  pool: Pool,
  userId: string,
  ip: string | null,
  now = Date.now()
): Promise<KeyFetchRateLimitResult> {
  const since = new Date(now - WINDOW_MS);
  const userLimit = limitPerUser();
  const ipLimit = limitPerIp();

  const counts = await pool.query<{ user_count: string; ip_count: string }>(
    `SELECT
       (SELECT count(*)::text FROM key_fetch_audit
        WHERE user_id = $1 AND fetched_at > $2) AS user_count,
       (SELECT count(*)::text FROM key_fetch_audit
        WHERE ip IS NOT DISTINCT FROM $3::inet AND fetched_at > $2) AS ip_count`,
    [userId, since, ip]
  );

  const userCount = Number.parseInt(counts.rows[0]?.user_count ?? "0", 10);
  const ipCount = Number.parseInt(counts.rows[0]?.ip_count ?? "0", 10);

  if (userCount >= userLimit || (ip !== null && ipCount >= ipLimit)) {
    const oldest = await pool.query<{ fetched_at: Date }>(
      `SELECT fetched_at FROM key_fetch_audit
       WHERE fetched_at > $3
         AND (user_id = $1 OR (ip IS NOT DISTINCT FROM $2::inet))
       ORDER BY fetched_at ASC
       LIMIT 1`,
      [userId, ip, since]
    );
    const oldestAt = oldest.rows[0]?.fetched_at?.getTime() ?? now;
    const retryAfterMs = Math.max(0, oldestAt + WINDOW_MS - now);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export async function recordKeyFetchAudit(
  pool: Pool,
  userId: string,
  ip: string | null,
  status: number
): Promise<void> {
  await pool.query(
    `INSERT INTO key_fetch_audit (user_id, ip, status) VALUES ($1, $2::inet, $3)`,
    [userId, ip, status]
  );
}

export function auditLogKeyFetch(
  userId: string,
  ip: string | null,
  status: number
): void {
  console.info(
    JSON.stringify({
      event: "key_material_fetch",
      userId,
      ip,
      status,
      ts: new Date().toISOString(),
    })
  );
}
