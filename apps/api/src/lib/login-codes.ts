import { randomBytes } from "node:crypto";
import { pool } from "../db/pool.js";

const LOGIN_CODE_TTL_MS = 5 * 60 * 1000;

function generateCode(): string {
  return randomBytes(32).toString("base64url");
}

export async function createLoginCode(userId: string): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + LOGIN_CODE_TTL_MS);

  await pool.query(
    `INSERT INTO login_codes (code, user_id, expires_at) VALUES ($1, $2, $3)`,
    [code, userId, expiresAt]
  );

  return code;
}

export async function exchangeLoginCode(
  code: string
): Promise<{ userId: string; email: string } | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const codeResult = await client.query<{ user_id: string }>(
      `DELETE FROM login_codes
       WHERE code = $1 AND expires_at > now()
       RETURNING user_id`,
      [code]
    );

    const row = codeResult.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }

    const userResult = await client.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE id = $1`,
      [row.user_id]
    );

    const user = userResult.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("COMMIT");
    return { userId: user.id, email: user.email };
  } catch {
    await client.query("ROLLBACK");
    throw new Error("login code exchange failed");
  } finally {
    client.release();
  }
}
