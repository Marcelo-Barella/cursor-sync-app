import { Hono } from "hono";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { hashPassword, verifyLoginPassword } from "../lib/password.js";
import { exchangeLoginCode } from "../lib/login-codes.js";
import { createSessionToken } from "../lib/session.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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

    const userResult = await client.query<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email`,
      [email, passwordHash]
    );

    const user = userResult.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return c.json({ error: "Failed to create user" }, 500);
    }

    await client.query(
      `INSERT INTO configs (user_id) VALUES ($1)`,
      [user.id]
    );

    await client.query("COMMIT");

    const token = createSessionToken(user.id, user.email);
    return c.json({ token }, 201);
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "23505"
    ) {
      return c.json({ error: "Invalid email or password" }, 400);
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

  const result = await pool.query<{ id: string; email: string; password_hash: string }>(
    `SELECT id, email, password_hash FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  const valid = await verifyLoginPassword(user?.password_hash ?? null, password);
  if (!user || !valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = createSessionToken(user.id, user.email);
  return c.json({ token });
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

  const token = createSessionToken(user.userId, user.email);
  return c.json({ token });
});

authRoutes.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");

  const result = await pool.query<{
    id: string;
    email: string;
    secrets_version: number;
  }>(
    `SELECT id, email, secrets_version FROM users WHERE id = $1`,
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
  });
});
