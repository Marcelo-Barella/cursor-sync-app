import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { minimalCse1EnvelopeForTests } from "../lib/cse1-manifest.js";
import { E2E_REQUIRED_MESSAGE } from "../lib/legacy-config-payload.js";
import {
  DEK_VERIFIER_HEX_LENGTH,
  MIN_SALT_BYTES,
  NONCE_BYTES,
} from "../lib/key-material.js";
import { pool } from "../db/pool.js";
import { hashPassword } from "../lib/password.js";
import { createSessionToken } from "../lib/session.js";
import { app } from "../test/app.js";

const databaseUrl = process.env.DATABASE_URL;

function b64(bytes: number): string {
  return Buffer.alloc(bytes, 1).toString("base64");
}

describe("configs E2E_REQUIRED after keys set", { skip: !databaseUrl }, () => {
  let userId: string;
  let token: string;

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";
    const email = `cfg-e2e-req-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password12345");
    const insert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, email_verified_at)
       VALUES ($1, $2, now()) RETURNING id`,
      [email, passwordHash]
    );
    userId = insert.rows[0]!.id;
    token = createSessionToken(userId, email);
    await pool.query(`INSERT INTO configs (user_id) VALUES ($1)`, [userId]);
    await pool.query(
      `INSERT INTO user_key_material (
         user_id, key_version, kdf, kdf_params, salt,
         pass_wrap_nonce, pass_wrapped_dek,
         recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier
       ) VALUES ($1, 1, 'argon2id', $2::jsonb, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        JSON.stringify({ m: 67108864, t: 3, p: 1 }),
        Buffer.alloc(MIN_SALT_BYTES, 1),
        Buffer.alloc(NONCE_BYTES, 2),
        Buffer.alloc(48, 3),
        Buffer.alloc(NONCE_BYTES, 2),
        Buffer.alloc(48, 3),
        "a".repeat(DEK_VERIFIER_HEX_LENGTH),
      ]
    );
  });

  after(async () => {
    if (userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
  });

  it("rejects legacy plaintext payload PUT with E2E_REQUIRED", async () => {
    const response = await app.request("/configs", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: { paths: { "settings.json": {} } } }),
    });
    assert.equal(response.status, 409);
    const body = (await response.json()) as { error: string; message: string };
    assert.equal(body.error, "E2E_REQUIRED");
    assert.equal(body.message, E2E_REQUIRED_MESSAGE);
  });

  it("allows clearLegacyPayload without a new plaintext payload", async () => {
    await pool.query(
      `UPDATE configs SET payload = $2 WHERE user_id = $1`,
      [userId, { paths: { "settings.json": {} } }]
    );

    const response = await app.request("/configs", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clearLegacyPayload: true }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { payload: Record<string, unknown> };
    assert.deepEqual(body.payload, {});
  });

  it("still accepts encrypted manifest writes", async () => {
    const manifest = minimalCse1EnvelopeForTests().toString("base64");
    const response = await app.request("/configs", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        manifestCiphertext: manifest,
        expectedManifestVersion: 0,
      }),
    });
    assert.equal(response.status, 200);
  });

  it("includes legacyPlaintextObjectKeys on GET when keys exist", async () => {
    await pool.query(
      `UPDATE configs SET payload = $2 WHERE user_id = $1`,
      [
        userId,
        {
          schemaVersion: 1,
          profile: "default",
          files: {
            "cursor-user/settings.json": { size: 1 },
            "chats/x.json": { size: 2 },
          },
        },
      ]
    );
    const response = await app.request("/configs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { legacyPlaintextObjectKeys: string[] };
    assert.deepEqual(body.legacyPlaintextObjectKeys, [
      "chats/x.json",
      "cursor-user/settings.json",
    ]);
  });
});
