import { Hono } from "hono";
import { z } from "zod";
import { decodeManifestCiphertextBase64 } from "../lib/cse1-manifest.js";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const putBodySchema = z
  .object({
    payload: z.record(z.unknown()).optional(),
    manifestCiphertext: z.string().min(1).optional(),
    expectedManifestVersion: z.number().int().min(0).optional(),
    clearLegacyPayload: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.payload !== undefined ||
      body.manifestCiphertext !== undefined ||
      body.clearLegacyPayload === true,
    { message: "No updates provided" }
  );

type ConfigRow = {
  payload: Record<string, unknown>;
  manifest_ciphertext: Buffer | null;
  manifest_version: number;
  updated_at: Date;
};

function configResponse(row: ConfigRow) {
  return {
    payload: row.payload,
    manifestCiphertext: row.manifest_ciphertext
      ? row.manifest_ciphertext.toString("base64")
      : null,
    manifestVersion: Number(row.manifest_version),
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
     RETURNING payload, manifest_ciphertext, manifest_version, updated_at`,
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

  if (parsed.data.manifestCiphertext !== undefined) {
    let manifestBuf: Buffer;
    try {
      manifestBuf = decodeManifestCiphertextBase64(parsed.data.manifestCiphertext);
    } catch {
      return c.json({ error: "Invalid payload" }, 400);
    }

    const expectedVersion = parsed.data.expectedManifestVersion;
    if (expectedVersion === undefined) {
      return c.json({ error: "Invalid payload" }, 400);
    }

    await pool.query(
      `INSERT INTO configs (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    const current = await pool.query<ConfigRow>(
      `SELECT payload, manifest_ciphertext, manifest_version, updated_at
       FROM configs WHERE user_id = $1`,
      [userId]
    );
    const existing = current.rows[0];
    const currentVersion = existing ? Number(existing.manifest_version) : 0;
    if (expectedVersion !== currentVersion) {
      return c.json({ error: "MANIFEST_VERSION_MISMATCH" }, 409);
    }

    const nextPayload =
      parsed.data.clearLegacyPayload === true
        ? {}
        : parsed.data.payload ?? existing?.payload ?? {};

    const updated = await pool.query<ConfigRow>(
      `UPDATE configs
       SET manifest_ciphertext = $2,
           manifest_version = manifest_version + 1,
           payload = $4,
           updated_at = now()
       WHERE user_id = $1 AND manifest_version = $3
       RETURNING payload, manifest_ciphertext, manifest_version, updated_at`,
      [userId, manifestBuf, expectedVersion, nextPayload]
    );

    if (updated.rows.length === 0) {
      return c.json({ error: "MANIFEST_VERSION_MISMATCH" }, 409);
    }

    return c.json(configResponse(updated.rows[0]!));
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
     RETURNING payload, manifest_ciphertext, manifest_version, updated_at`,
    [userId, nextPayload]
  );

  const row = result.rows[0];
  if (!row) {
    return c.json({ error: "Failed to save config" }, 500);
  }

  return c.json(configResponse(row));
});
