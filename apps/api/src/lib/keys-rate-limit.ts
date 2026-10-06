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

export type KeyFetchRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

const EXCLUDE_429 = `status <> ${KEY_FETCH_STATUS.RATE_LIMITED}`;

export async function checkKeyFetchRateLimit(
  pool: Pool,
  userId: string,
  ip: string | null,
  now = Date.now()
): Promise<KeyFetchRateLimitResult> {
  const since = new Date(now - WINDOW_MS);
  const userLimit = limitPerUser();
  const ipLimit = limitPerIp();

  const userCountResult = await pool.query<{ user_count: string }>(
    `SELECT count(*)::text AS user_count FROM key_fetch_audit
     WHERE user_id = $1 AND fetched_at > $2 AND ${EXCLUDE_429}`,
    [userId, since]
  );
  const userCount = Number.parseInt(userCountResult.rows[0]?.user_count ?? "0", 10);

  let ipCount = 0;
  if (ip !== null) {
    const ipCountResult = await pool.query<{ ip_count: string }>(
      `SELECT count(*)::text AS ip_count FROM key_fetch_audit
       WHERE ip = $2::inet AND fetched_at > $1 AND ${EXCLUDE_429}`,
      [since, ip]
    );
    ipCount = Number.parseInt(ipCountResult.rows[0]?.ip_count ?? "0", 10);
  }

  const userLimited = userCount >= userLimit;
  const ipLimited = ip !== null && ipCount >= ipLimit;

  if (!userLimited && !ipLimited) {
    return { allowed: true };
  }

  const retryAfterSecondsCandidates: number[] = [];

  if (userLimited) {
    const oldestUser = await pool.query<{ fetched_at: Date }>(
      `SELECT fetched_at FROM key_fetch_audit
       WHERE user_id = $1 AND fetched_at > $2 AND ${EXCLUDE_429}
       ORDER BY fetched_at ASC
       LIMIT 1`,
      [userId, since]
    );
    const t = oldestUser.rows[0]?.fetched_at?.getTime();
    if (t !== undefined) {
      retryAfterSecondsCandidates.push(
        Math.max(1, Math.ceil((t + WINDOW_MS - now) / 1000))
      );
    }
  }

  if (ipLimited && ip !== null) {
    const oldestIp = await pool.query<{ fetched_at: Date }>(
      `SELECT fetched_at FROM key_fetch_audit
       WHERE ip = $2::inet AND fetched_at > $1 AND ${EXCLUDE_429}
       ORDER BY fetched_at ASC
       LIMIT 1`,
      [since, ip]
    );
    const t = oldestIp.rows[0]?.fetched_at?.getTime();
    if (t !== undefined) {
      retryAfterSecondsCandidates.push(
        Math.max(1, Math.ceil((t + WINDOW_MS - now) / 1000))
      );
    }
  }

  const retryAfterSeconds =
    retryAfterSecondsCandidates.length > 0
      ? Math.max(...retryAfterSecondsCandidates)
      : 1;
  return { allowed: false, retryAfterSeconds };
}

export async function recordKeyFetchAudit(
  pool: Pool,
  userId: string,
  ip: string | null,
  status: number
): Promise<void> {
  if (ip === null) {
    await pool.query(
      `INSERT INTO key_fetch_audit (user_id, ip, status) VALUES ($1, NULL, $2)`,
      [userId, status]
    );
    return;
  }
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
