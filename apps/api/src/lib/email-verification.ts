import { createHash, randomBytes } from "node:crypto";
import type { Pool, PoolClient } from "pg";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function hashEmailVerificationToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateEmailVerificationToken(): string {
  return randomBytes(32).toString("base64url");
}

type Queryable = Pick<Pool, "query"> | PoolClient;

export async function insertEmailVerificationToken(
  db: Queryable,
  userId: string,
  rawToken: string
): Promise<void> {
  const tokenHash = hashEmailVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await db.query(
    `INSERT INTO email_verification_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [tokenHash, userId, expiresAt]
  );
}

export async function consumeEmailVerificationToken(
  pool: Pool,
  rawToken: string
): Promise<string | null> {
  const tokenHash = hashEmailVerificationToken(rawToken);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const consumed = await client.query<{ user_id: string }>(
      `UPDATE email_verification_tokens
       SET used_at = now()
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > now()
       RETURNING user_id`,
      [tokenHash]
    );

    const userId = consumed.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE users
       SET email_verified_at = coalesce(email_verified_at, now()),
           updated_at = now()
       WHERE id = $1`,
      [userId]
    );

    await client.query("COMMIT");
    return userId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function isEmailVerified(
  emailVerifiedAt: Date | string | null | undefined
): boolean {
  return emailVerifiedAt != null;
}
