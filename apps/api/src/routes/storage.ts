import { Hono } from "hono";
import { z } from "zod";
import { plaintextDeleteHttpStatus } from "../lib/plaintext-object-delete-response.js";
import { filterPlaintextObjectKeys } from "../lib/plaintext-object-keys.js";
import {
  deleteUserObjectsDetailed,
  getR2Config,
  listPlaintextUserObjects,
  mintTempCredentials,
  R2_TEMP_CREDENTIALS_MAX_TTL_SECONDS,
  R2_TEMP_CREDENTIALS_MIN_TTL_SECONDS,
} from "../lib/r2.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireEmailVerified } from "../middleware/require-email-verified.js";

const DEFAULT_TTL_SECONDS = 900;

const credentialsBodySchema = z.object({
  ttlSeconds: z
    .number()
    .int()
    .min(R2_TEMP_CREDENTIALS_MIN_TTL_SECONDS)
    .max(R2_TEMP_CREDENTIALS_MAX_TTL_SECONDS)
    .optional(),
});

const deletePlaintextBodySchema = z.object({
  keys: z.array(z.string()).min(1).max(500),
});

export const storageRoutes = new Hono<{ Variables: AuthVariables }>();

storageRoutes.get(
  "/plaintext-objects",
  requireAuth,
  requireEmailVerified,
  async (c) => {
    const config = getR2Config();
    if (!config) {
      return c.json({ error: "Storage credentials unavailable" }, 503);
    }

    const userId = c.get("userId");
    try {
      const keys = await listPlaintextUserObjects(config, userId);
      return c.json({ keys });
    } catch {
      return c.json({ error: "Failed to list objects" }, 502);
    }
  }
);

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
      const results = await deleteUserObjectsDetailed(config, userId, keys);
      return c.json({ results }, plaintextDeleteHttpStatus(results));
    } catch {
      return c.json({ error: "Failed to delete objects" }, 502);
    }
  }
);

storageRoutes.post(
  "/credentials",
  requireAuth,
  requireEmailVerified,
  async (c) => {
    const config = getR2Config();
    if (!config) {
      return c.json({ error: "Storage credentials unavailable" }, 503);
    }

    const rawBody = await c.req.json().catch(() => ({}));
    const parsed = credentialsBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      const ttlIssue = parsed.error.issues.find((issue) =>
        issue.path.includes("ttlSeconds")
      );
      if (ttlIssue) {
        return c.json(
          {
            error: `ttlSeconds must be an integer between ${R2_TEMP_CREDENTIALS_MIN_TTL_SECONDS} and ${R2_TEMP_CREDENTIALS_MAX_TTL_SECONDS}`,
          },
          400
        );
      }
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
  }
);
