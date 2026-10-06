import type { IncomingMessage } from "node:http";
import { Hono } from "hono";
import { pool } from "../db/pool.js";
import { classifyKeyMaterialUpdateFailure } from "../lib/key-material-update.js";
import {
  KeyMaterialValidationError,
  parseRecoveryBody,
  parseRewrapBody,
  parseSetupBody,
  recoveryBodySchema,
  rewrapBodySchema,
  rowToKeyResponse,
  setupBodySchema,
} from "../lib/key-material.js";
import {
  KEY_FETCH_STATUS,
  auditLogKeyFetch,
  checkKeyFetchRateLimit,
  recordKeyFetchAudit,
  resolveKeyFetchClientIp,
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

function requestClientIp(c: { req: { raw: Request; header: (name: string) => string | undefined } }): string | null {
  const incoming = c.req.raw as unknown as IncomingMessage;
  const remoteAddress = incoming.socket?.remoteAddress ?? null;
  return resolveKeyFetchClientIp(c.req.header("x-forwarded-for"), remoteAddress);
}

function keyMaterialJsonError(
  reason: "KEYS_NOT_SET" | "KEY_VERSION_MISMATCH" | "DEK_VERIFIER_MISMATCH"
) {
  if (reason === "KEYS_NOT_SET") {
    return { status: 404 as const, body: { error: "KEYS_NOT_SET" } };
  }
  if (reason === "DEK_VERIFIER_MISMATCH") {
    return { status: 403 as const, body: { error: "DEK_VERIFIER_MISMATCH" } };
  }
  return { status: 409 as const, body: { error: "KEY_VERSION_MISMATCH" } };
}

export const keysRoutes = new Hono<{ Variables: AuthVariables }>();

keysRoutes.use("*", requireAuth, requireEmailVerified);

keysRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const ip = requestClientIp(c);

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

  const inserted = await pool.query<{ user_id: string }>(
    `INSERT INTO user_key_material (
       user_id, key_version, kdf, kdf_params, salt,
       pass_wrap_nonce, pass_wrapped_dek,
       recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING user_id`,
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

  if (inserted.rows.length === 0) {
    return c.json({ error: "KEYS_ALREADY_SET" }, 409);
  }

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

  const updated = await pool.query<KeyRow>(
    `UPDATE user_key_material
     SET kdf_params = $4, salt = $5,
         pass_wrap_nonce = $6, pass_wrapped_dek = $7,
         updated_at = now()
     WHERE user_id = $1 AND key_version = $2 AND dek_verifier = $3
     RETURNING key_version, kdf, kdf_params, salt,
               pass_wrap_nonce, pass_wrapped_dek,
               recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier`,
    [
      userId,
      material.keyVersion,
      material.dekVerifier,
      material.kdfParams,
      material.salt,
      material.passWrap.nonce,
      material.passWrap.ct,
    ]
  );

  if (updated.rows.length === 0) {
    const reason = await classifyKeyMaterialUpdateFailure(
      pool,
      userId,
      material.keyVersion,
      material.dekVerifier
    );
    const err = keyMaterialJsonError(reason);
    return c.json(err.body, err.status);
  }

  return c.json(rowToKeyResponse(updated.rows[0]!));
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

  const updated = await pool.query<KeyRow>(
    `UPDATE user_key_material
     SET recovery_wrap_nonce = $4, recovery_wrapped_dek = $5,
         updated_at = now()
     WHERE user_id = $1 AND key_version = $2 AND dek_verifier = $3
     RETURNING key_version, kdf, kdf_params, salt,
               pass_wrap_nonce, pass_wrapped_dek,
               recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier`,
    [
      userId,
      material.keyVersion,
      material.dekVerifier,
      material.recoveryWrap.nonce,
      material.recoveryWrap.ct,
    ]
  );

  if (updated.rows.length === 0) {
    const reason = await classifyKeyMaterialUpdateFailure(
      pool,
      userId,
      material.keyVersion,
      material.dekVerifier
    );
    const err = keyMaterialJsonError(reason);
    return c.json(err.body, err.status);
  }

  return c.json(rowToKeyResponse(updated.rows[0]!));
});
