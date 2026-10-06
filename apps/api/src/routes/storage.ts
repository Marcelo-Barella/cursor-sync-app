import { Hono } from "hono";
import { z } from "zod";
import { filterPlaintextObjectKeys } from "../lib/plaintext-object-keys.js";
import { deleteUserObjects, getR2Config, mintTempCredentials } from "../lib/r2.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireEmailVerified } from "../middleware/require-email-verified.js";

const DEFAULT_TTL_SECONDS = 900;

const credentialsBodySchema = z.object({
  ttlSeconds: z.number().int().positive().optional(),
});

const deletePlaintextBodySchema = z.object({
  keys: z.array(z.string()).min(1).max(500),
});

export const storageRoutes = new Hono<{ Variables: AuthVariables }>();

storageRoutes.post(
  "/plaintext-objects/delete",
  requireAuth,
  requireEmailVerified,
  async (c) => {
    const config = getR2Config();
    if (!config) {
      return c.json({ error: "Storage credentials unavailable" }, 503);
    }

    const rawBody = await c.req.json().catch(() => null);
    const parsed = deletePlaintextBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: "Invalid request body" }, 400);
    }

    const keys = filterPlaintextObjectKeys(parsed.data.keys);
    if (!keys) {
      return c.json({ error: "Invalid object keys" }, 400);
    }

    const userId = c.get("userId");

    try {
      await deleteUserObjects(config, userId, keys);
      return c.json({ deleted: keys });
    } catch {
      return c.json({ error: "Failed to delete objects" }, 502);
    }
  }
);

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
