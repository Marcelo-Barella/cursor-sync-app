import { Hono } from "hono";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const putBodySchema = z.object({
  payload: z.record(z.unknown()),
});

export const configsRoutes = new Hono<{ Variables: AuthVariables }>();

configsRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");

  const result = await pool.query<{
    payload: Record<string, unknown>;
    updated_at: Date;
  }>(
    `INSERT INTO configs (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING payload, updated_at`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    return c.json({ error: "Failed to load config" }, 500);
  }

  return c.json({
    payload: row.payload,
    updated_at: row.updated_at,
  });
});

configsRoutes.put("/", requireAuth, async (c) => {
  const userId = c.get("userId");

  const body = await c.req.json().catch(() => null);
  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const result = await pool.query<{
    payload: Record<string, unknown>;
    updated_at: Date;
  }>(
    `INSERT INTO configs (user_id, payload, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE
     SET payload = EXCLUDED.payload, updated_at = now()
     RETURNING payload, updated_at`,
    [userId, parsed.data.payload]
  );

  const row = result.rows[0];
  if (!row) {
    return c.json({ error: "Failed to save config" }, 500);
  }

  return c.json({
    payload: row.payload,
    updated_at: row.updated_at,
  });
});
