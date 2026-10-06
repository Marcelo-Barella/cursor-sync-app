import { createMiddleware } from "hono/factory";
import { pool } from "../db/pool.js";
import { isEmailVerified } from "../lib/email-verification.js";
import type { AuthVariables } from "./auth.js";

export const requireEmailVerified = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const userId = c.get("userId");
    const result = await pool.query<{ email_verified_at: Date | null }>(
      `SELECT email_verified_at FROM users WHERE id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (!row || !isEmailVerified(row.email_verified_at)) {
      return c.json({ error: "EMAIL_NOT_VERIFIED" }, 403);
    }
    await next();
  }
);
