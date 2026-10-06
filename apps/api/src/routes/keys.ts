import { Hono } from "hono";
import { pool } from "../db/pool.js";
import {
  KeyMaterialValidationError,
  parseRecoveryBody,
  parseRewrapBody,
  parseSetupBody,
  recoveryBodySchema,
  rewrapBodySchema,
  rowToKeyResponse,
  setupBodySchema,
  dekVerifiersMatch,
} from "../lib/key-material.js";
import {
  KEY_FETCH_STATUS,
  auditLogKeyFetch,
  checkKeyFetchRateLimit,
  clientIpFromRequest,
  recordKeyFetchAudit,
} from "../lib/keys-rate-limit.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireEmailVerified } from "../middleware/require-email-verified.js";

type KeyRow = {
  key_version: number;
  kdf: string;
  kdf_params: { m: number; t: number; p: number };
  salt: Buffer;
  pass_wrap_nonce: Buffer;
  pass_wrapped_dek: Buffer;
  recovery_wrap_nonce: Buffer;
  recovery_wrapped_dek: Buffer;
  dek_verifier: string;
};

export const keysRoutes = new Hono<{ Variables: AuthVariables }>();

keysRoutes.use("*", requireAuth, requireEmailVerified);

keysRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const ip = clientIpFromRequest(c.req.raw.headers);

  const rate = await checkKeyFetchRateLimit(pool, userId, ip);
  if (!rate.allowed) {
    await recordKeyFetchAudit(pool, userId, ip, KEY_FETCH_STATUS.RATE_LIMITED);
    auditLogKeyFetch(userId, ip, KEY_FETCH_STATUS.RATE_LIMITED);
    c.header("Retry-After", String(rate.retryAfterSeconds));
    return c.json({ error: "RATE_LIMITED" }, 429);
  }

  const result = await pool.query<KeyRow>(
    `SELECT key_version, kdf, kdf_params, salt,
            pass_wrap_nonce, pass_wrapped_dek,
            recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier
     FROM user_key_material WHERE user_id = $1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    await recordKeyFetchAudit(pool, userId, ip, KEY_FETCH_STATUS.NOT_SET);
    auditLogKeyFetch(userId, ip, KEY_FETCH_STATUS.NOT_SET);
    return c.json({ error: "KEYS_NOT_SET" }, 404);
  }

  await recordKeyFetchAudit(pool, userId, ip, KEY_FETCH_STATUS.OK);
  auditLogKeyFetch(userId, ip, KEY_FETCH_STATUS.OK);

  return c.json(rowToKeyResponse(row));
});

keysRoutes.put("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = setupBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "INVALID_PAYLOAD" }, 400);
  }

  let material: ReturnType<typeof parseSetupBody>;
  try {
    material = parseSetupBody(parsed.data);
  } catch (err) {
    if (err instanceof KeyMaterialValidationError) {
      return c.json({ error: "INVALID_PAYLOAD", message: err.message }, 400);
    }
    throw err;
  }

  const existing = await pool.query(`SELECT user_id FROM user_key_material WHERE user_id = $1`, [
    userId,
  ]);
  if (existing.rows.length > 0) {
    return c.json({ error: "KEYS_ALREADY_SET" }, 409);
  }

  await pool.query(
    `INSERT INTO user_key_material (
       user_id, key_version, kdf, kdf_params, salt,
       pass_wrap_nonce, pass_wrapped_dek,
       recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      userId,
      material.keyVersion,
      material.kdf,
      material.kdfParams,
      material.salt,
      material.passWrap.nonce,
      material.passWrap.ct,
      material.recoveryWrap.nonce,
      material.recoveryWrap.ct,
      material.dekVerifier,
    ]
  );

  return c.json(rowToKeyResponse({
    key_version: material.keyVersion,
    kdf: material.kdf,
    kdf_params: material.kdfParams,
    salt: material.salt,
    pass_wrap_nonce: material.passWrap.nonce,
    pass_wrapped_dek: material.passWrap.ct,
    recovery_wrap_nonce: material.recoveryWrap.nonce,
    recovery_wrapped_dek: material.recoveryWrap.ct,
  }), 201);
});

keysRoutes.post("/rewrap", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = rewrapBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "INVALID_PAYLOAD" }, 400);
  }

  let material: ReturnType<typeof parseRewrapBody>;
  try {
    material = parseRewrapBody(parsed.data);
  } catch (err) {
    if (err instanceof KeyMaterialValidationError) {
      return c.json({ error: "INVALID_PAYLOAD", message: err.message }, 400);
    }
    throw err;
  }

  const result = await pool.query<KeyRow>(
    `SELECT key_version, kdf, kdf_params, salt,
            pass_wrap_nonce, pass_wrapped_dek,
            recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier
     FROM user_key_material WHERE user_id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) {
    return c.json({ error: "KEYS_NOT_SET" }, 404);
  }

  if (row.key_version !== material.keyVersion) {
    return c.json({ error: "KEY_VERSION_MISMATCH" }, 409);
  }

  if (!dekVerifiersMatch(row.dek_verifier, material.dekVerifier)) {
    return c.json({ error: "DEK_VERIFIER_MISMATCH" }, 403);
  }

  await pool.query(
    `UPDATE user_key_material
     SET kdf_params = $2, salt = $3,
         pass_wrap_nonce = $4, pass_wrapped_dek = $5,
         updated_at = now()
     WHERE user_id = $1`,
    [
      userId,
      material.kdfParams,
      material.salt,
      material.passWrap.nonce,
      material.passWrap.ct,
    ]
  );

  const updated = await pool.query<KeyRow>(
    `SELECT key_version, kdf, kdf_params, salt,
            pass_wrap_nonce, pass_wrapped_dek,
            recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier
     FROM user_key_material WHERE user_id = $1`,
    [userId]
  );
  const next = updated.rows[0]!;
  return c.json(rowToKeyResponse(next));
});

keysRoutes.post("/recovery", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = recoveryBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "INVALID_PAYLOAD" }, 400);
  }

  let material: ReturnType<typeof parseRecoveryBody>;
  try {
    material = parseRecoveryBody(parsed.data);
  } catch (err) {
    if (err instanceof KeyMaterialValidationError) {
      return c.json({ error: "INVALID_PAYLOAD", message: err.message }, 400);
    }
    throw err;
  }

  const result = await pool.query<KeyRow>(
    `SELECT key_version, dek_verifier,
            recovery_wrap_nonce, recovery_wrapped_dek,
            kdf, kdf_params, salt, pass_wrap_nonce, pass_wrapped_dek
     FROM user_key_material WHERE user_id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) {
    return c.json({ error: "KEYS_NOT_SET" }, 404);
  }

  if (row.key_version !== material.keyVersion) {
    return c.json({ error: "KEY_VERSION_MISMATCH" }, 409);
  }

  if (!dekVerifiersMatch(row.dek_verifier, material.dekVerifier)) {
    return c.json({ error: "DEK_VERIFIER_MISMATCH" }, 403);
  }

  await pool.query(
    `UPDATE user_key_material
     SET recovery_wrap_nonce = $2, recovery_wrapped_dek = $3,
         updated_at = now()
     WHERE user_id = $1`,
    [userId, material.recoveryWrap.nonce, material.recoveryWrap.ct]
  );

  const updated = await pool.query<KeyRow>(
    `SELECT key_version, kdf, kdf_params, salt,
            pass_wrap_nonce, pass_wrapped_dek,
            recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier
     FROM user_key_material WHERE user_id = $1`,
    [userId]
  );
  const next = updated.rows[0]!;
  return c.json(rowToKeyResponse(next));
});
