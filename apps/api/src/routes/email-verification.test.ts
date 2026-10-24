import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { pool } from "../db/pool.js";
import { hashPassword } from "../lib/password.js";
import {
  EMAIL_VERIFICATION_TTL_MS,
  generateEmailVerificationToken,
} from "../lib/email-verification.js";
import { resetResendRateLimit } from "../lib/resend-rate-limit.js";
import { app } from "../test/app.js";

const databaseUrl = process.env.DATABASE_URL;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

describe("email verification API", { skip: !databaseUrl }, () => {
  let userId: string;
  let userEmail: string;

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";
    resetResendRateLimit();
    userEmail = `verify-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password12345");
    const insert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [userEmail, passwordHash]
    );
    userId = insert.rows[0]!.id;
    await pool.query(`INSERT INTO configs (user_id) VALUES ($1)`, [userId]);
  });

  after(async () => {
    resetResendRateLimit();
    if (userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
  });

  it("verifies email via POST /auth/verify-email", async () => {
    const raw = generateEmailVerificationToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    await pool.query(
      `INSERT INTO email_verification_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [hashToken(raw), userId, expiresAt]
    );

    const response = await app.request("/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: raw }),
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as { ok: boolean; emailVerified: boolean };
    assert.equal(body.ok, true);
    assert.equal(body.emailVerified, true);

    const user = await pool.query<{ email_verified_at: Date | null }>(
      `SELECT email_verified_at FROM users WHERE id = $1`,
      [userId]
    );
    assert.ok(user.rows[0]?.email_verified_at);

    const reuse = await app.request("/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: raw }),
    });
    assert.equal(reuse.status, 400);
  });
});
