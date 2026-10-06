import type { Pool } from "pg";

const WINDOW_MS = 15 * 60 * 1000;

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

export function clientIpFromRequest(headers: Headers): string {
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
  return "unknown";
}

export type KeyFetchRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function checkKeyFetchRateLimit(
  pool: Pool,
  userId: string,
  ip: string,
  now = Date.now()
): Promise<KeyFetchRateLimitResult> {
  const since = new Date(now - WINDOW_MS);
  const userLimit = limitPerUser();
  const ipLimit = limitPerIp();

  const counts = await pool.query<{ user_count: string; ip_count: string }>(
    `SELECT
       (SELECT count(*)::text FROM key_material_fetch_events
        WHERE user_id = $1 AND created_at > $2) AS user_count,
       (SELECT count(*)::text FROM key_material_fetch_events
        WHERE ip = $3 AND created_at > $2) AS ip_count`,
    [userId, since, ip]
  );

  const userCount = Number.parseInt(counts.rows[0]?.user_count ?? "0", 10);
  const ipCount = Number.parseInt(counts.rows[0]?.ip_count ?? "0", 10);

  if (userCount >= userLimit || ipCount >= ipLimit) {
    const oldest = await pool.query<{ created_at: Date }>(
      `SELECT created_at FROM key_material_fetch_events
       WHERE (user_id = $1 OR ip = $2) AND created_at > $3
       ORDER BY created_at ASC
       LIMIT 1`,
      [userId, ip, since]
    );
    const oldestAt = oldest.rows[0]?.created_at?.getTime() ?? now;
    const retryAfterMs = Math.max(0, oldestAt + WINDOW_MS - now);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export async function recordKeyFetchEvent(
  pool: Pool,
  userId: string,
  ip: string
): Promise<void> {
  await pool.query(
    `INSERT INTO key_material_fetch_events (user_id, ip) VALUES ($1, $2)`,
    [userId, ip]
  );
}

export function auditLogKeyFetch(userId: string, ip: string): void {
  console.info(
    JSON.stringify({
      event: "key_material_fetch",
      userId,
      ip,
      ts: new Date().toISOString(),
    })
  );
}
