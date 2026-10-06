import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const putBodySchema = z
  .object({
    payload: z.record(z.unknown()).optional(),
    encryptedManifest: z.string().min(1).optional(),
    expectedManifestEtag: z.string().nullable().optional(),
    clearLegacyPayload: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.payload !== undefined ||
      body.encryptedManifest !== undefined ||
      body.clearLegacyPayload === true,
    { message: "No updates provided" }
  );

type ConfigRow = {
  payload: Record<string, unknown>;
  encrypted_manifest: Buffer | null;
  manifest_etag: string | null;
  updated_at: Date;
};

function configResponse(row: ConfigRow) {
  return {
    payload: row.payload,
    encryptedManifest: row.encrypted_manifest
      ? row.encrypted_manifest.toString("base64")
      : null,
    manifestEtag: row.manifest_etag,
    updated_at: row.updated_at,
  };
}

export const configsRoutes = new Hono<{ Variables: AuthVariables }>();

configsRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");

  const result = await pool.query<ConfigRow>(
    `INSERT INTO configs (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING payload, encrypted_manifest, manifest_etag, updated_at`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    return c.json({ error: "Failed to load config" }, 500);
  }

  return c.json(configResponse(row));
});

configsRoutes.put("/", requireAuth, async (c) => {
  const userId = c.get("userId");

  const body = await c.req.json().catch(() => null);
  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const current = await pool.query<ConfigRow>(
    `SELECT payload, encrypted_manifest, manifest_etag, updated_at
     FROM configs WHERE user_id = $1`,
    [userId]
  );
  const existing = current.rows[0];

  if (parsed.data.encryptedManifest !== undefined) {
    const expected = parsed.data.expectedManifestEtag ?? null;
    const currentEtag = existing?.manifest_etag ?? null;
    if (expected !== currentEtag) {
      return c.json({ error: "MANIFEST_ETAG_MISMATCH" }, 409);
    }

    let manifestBuf: Buffer;
    try {
      manifestBuf = Buffer.from(parsed.data.encryptedManifest, "base64");
    } catch {
      return c.json({ error: "Invalid payload" }, 400);
    }
    if (manifestBuf.length === 0) {
      return c.json({ error: "Invalid payload" }, 400);
    }

    const nextPayload =
      parsed.data.clearLegacyPayload === true
        ? {}
        : parsed.data.payload ?? existing?.payload ?? {};
    const nextEtag = randomUUID();

    const result = await pool.query<ConfigRow>(
      `INSERT INTO configs (user_id, payload, encrypted_manifest, manifest_etag, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id) DO UPDATE
       SET payload = EXCLUDED.payload,
           encrypted_manifest = EXCLUDED.encrypted_manifest,
           manifest_etag = EXCLUDED.manifest_etag,
           updated_at = now()
       RETURNING payload, encrypted_manifest, manifest_etag, updated_at`,
      [userId, nextPayload, manifestBuf, nextEtag]
    );

    const row = result.rows[0];
    if (!row) {
      return c.json({ error: "Failed to save config" }, 500);
    }

    return c.json(configResponse(row));
  }

  if (parsed.data.payload === undefined && parsed.data.clearLegacyPayload !== true) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const nextPayload =
    parsed.data.clearLegacyPayload === true ? {} : parsed.data.payload ?? {};

  const result = await pool.query<ConfigRow>(
    `INSERT INTO configs (user_id, payload, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE
     SET payload = EXCLUDED.payload, updated_at = now()
     RETURNING payload, encrypted_manifest, manifest_etag, updated_at`,
    [userId, nextPayload]
  );

  const row = result.rows[0];
  if (!row) {
    return c.json({ error: "Failed to save config" }, 500);
  }

  return c.json(configResponse(row));
});
