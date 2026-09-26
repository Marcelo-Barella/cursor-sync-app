import { Hono } from "hono";
import { z } from "zod";
import { pool } from "../db/pool.js";
import {
  consumeEmailVerificationToken,
  isEmailVerified,
} from "../lib/email-verification.js";
import { hashPassword, verifyLoginPassword } from "../lib/password.js";
import { exchangeLoginCode } from "../lib/login-codes.js";
import {
  canResendVerification,
  markVerificationResent,
} from "../lib/resend-rate-limit.js";
import { createSessionToken, verifySessionToken } from "../lib/session.js";
import { issueAndSendVerificationEmail } from "../lib/verification-email.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const resendByEmailSchema = z.object({
  email: z.string().email(),
});

type UserRow = {
  id: string;
  email: string;
  email_verified_at: Date | null;
};

async function loadUserAuthFields(userId: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, email, email_verified_at FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

function sessionJson(
  token: string,
  user: Pick<UserRow, "email_verified_at">,
  extra?: Record<string, unknown>
) {
  return {
    token,
    emailVerified: isEmailVerified(user.email_verified_at),
    ...extra,
  };
}

export const authRoutes = new Hono<{ Variables: AuthVariables }>();

authRoutes.post("/signup", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = authSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid email or password" }, 400);
  }

  const { email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query<{
      id: string;
      email: string;
      email_verified_at: Date | null;
    }>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, email_verified_at`,
      [email, passwordHash]
    );

    const user = userResult.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return c.json({ error: "Failed to create user" }, 500);
    }

    await client.query(`INSERT INTO configs (user_id) VALUES ($1)`, [user.id]);

    await client.query("COMMIT");

    const verification = await issueAndSendVerificationEmail(pool, user.id, user.email);
    const token = createSessionToken(user.id, user.email);

    return c.json(
      sessionJson(token, user, {
        verificationEmailSent: verification.sent,
        ...(verification.warning
          ? { verificationEmailWarning: verification.warning }
          : {}),
      }),
      201
    );
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "23505"
    ) {
      return c.json({ error: "Email already registered" }, 409);
    }
    throw err;
  } finally {
    client.release();
  }
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = authSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid email or password" }, 400);
  }

  const { email, password } = parsed.data;

  const result = await pool.query<UserRow & { password_hash: string }>(
    `SELECT id, email, password_hash, email_verified_at FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  const valid = await verifyLoginPassword(user?.password_hash ?? null, password);
  if (!user || !valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = createSessionToken(user.id, user.email);
  return c.json(sessionJson(token, user));
});

authRoutes.post("/token", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ code: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request" }, 400);
  }

  const user = await exchangeLoginCode(parsed.data.code);
  if (!user) {
    return c.json({ error: "Invalid request" }, 400);
  }

  const row = await loadUserAuthFields(user.userId);
  const token = createSessionToken(user.userId, user.email);
  return c.json(
    sessionJson(token, row ?? { email_verified_at: null })
  );
});

authRoutes.post("/verify-email", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid or expired verification link" }, 400);
  }

  const userId = await consumeEmailVerificationToken(pool, parsed.data.token);
  if (!userId) {
    return c.json({ error: "Invalid or expired verification link" }, 400);
  }

  return c.json({ ok: true, emailVerified: true });
});

authRoutes.get("/verify-email", async (c) => {
  const token = c.req.query("token");
  const parsed = verifyEmailSchema.safeParse({ token });
  if (!parsed.success) {
    return c.json({ error: "Invalid or expired verification link" }, 400);
  }

  const userId = await consumeEmailVerificationToken(pool, parsed.data.token);
  if (!userId) {
    return c.json({ error: "Invalid or expired verification link" }, 400);
  }

  return c.json({ ok: true, emailVerified: true });
});

authRoutes.post("/resend-verification", async (c) => {
  let userId: string | null = null;
  let userEmail: string | null = null;

  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifySessionToken(header.slice("Bearer ".length));
      userId = payload.sub;
      userEmail = payload.email;
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
  } else {
    const body = await c.req.json().catch(() => null);
    const parsed = resendByEmailSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid email" }, 400);
    }
    const result = await pool.query<UserRow>(
      `SELECT id, email, email_verified_at FROM users WHERE email = $1`,
      [parsed.data.email]
    );
    const user = result.rows[0];
    if (!user) {
      return c.json({ sent: true });
    }
    userId = user.id;
    userEmail = user.email;
    if (isEmailVerified(user.email_verified_at)) {
      return c.json({ sent: true, alreadyVerified: true });
    }
  }

  if (!userId || !userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const row = await loadUserAuthFields(userId);
  if (row && isEmailVerified(row.email_verified_at)) {
    return c.json({ sent: true, alreadyVerified: true });
  }

  if (!canResendVerification(userId)) {
    return c.json({ error: "Please wait before requesting another email" }, 429);
  }

  const outcome = await issueAndSendVerificationEmail(pool, userId, userEmail);
  if (outcome.sent) {
    markVerificationResent(userId);
  }

  return c.json({
    sent: outcome.sent,
    ...(outcome.warning ? { warning: outcome.warning } : {}),
  });
});

authRoutes.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");

  const result = await pool.query<{
    id: string;
    email: string;
    secrets_version: number;
    email_verified_at: Date | null;
  }>(
    `SELECT id, email, secrets_version, email_verified_at FROM users WHERE id = $1`,
    [userId]
  );

  const user = result.rows[0];
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({
    id: user.id,
    email: user.email,
    secrets_version: user.secrets_version,
    emailVerified: isEmailVerified(user.email_verified_at),
  });
});
