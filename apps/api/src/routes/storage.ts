import { Hono } from "hono";
import { z } from "zod";
import { getR2Config, mintTempCredentials } from "../lib/r2.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const DEFAULT_TTL_SECONDS = 900;

const credentialsBodySchema = z.object({
  ttlSeconds: z.number().int().positive().optional(),
});

export const storageRoutes = new Hono<{ Variables: AuthVariables }>();

storageRoutes.post("/credentials", requireAuth, async (c) => {
  const config = getR2Config();
  if (!config) {
    return c.json({ error: "Storage credentials unavailable" }, 503);
  }

  const rawBody = await c.req.json().catch(() => ({}));
  const parsed = credentialsBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const ttlSeconds = parsed.data.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const userId = c.get("userId");

  try {
    const credentials = await mintTempCredentials(config, userId, ttlSeconds);
    return c.json(credentials);
  } catch {
    return c.json({ error: "Failed to mint storage credentials" }, 502);
  }
});
