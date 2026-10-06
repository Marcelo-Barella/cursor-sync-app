import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";
import { pool } from "../db/pool.js";
import { hashPassword } from "../lib/password.js";
import {
  DEK_VERIFIER_HEX_LENGTH,
  NONCE_BYTES,
  SALT_BYTES,
  WRAPPED_DEK_BYTES,
} from "../lib/key-material.js";
import { createSessionToken } from "../lib/session.js";
import { app } from "../test/app.js";

const databaseUrl = process.env.DATABASE_URL;

function b64(bytes: number): string {
  return Buffer.alloc(bytes, 7).toString("base64");
}

function validSetupBody(overrides: Record<string, unknown> = {}) {
  const dekVerifier = "c".repeat(DEK_VERIFIER_HEX_LENGTH);
  return {
    keyVersion: 1,
    kdf: "argon2id",
    kdfParams: { m: 64 * 1024 * 1024, t: 3, p: 1 },
    salt: b64(SALT_BYTES),
    passWrap: { nonce: b64(NONCE_BYTES), ct: b64(WRAPPED_DEK_BYTES) },
    recoveryWrap: { nonce: b64(NONCE_BYTES), ct: b64(WRAPPED_DEK_BYTES) },
    dekVerifier,
    ...overrides,
  };
}

describe("v1 keys API", { skip: !databaseUrl }, () => {
  let verifiedUserId: string;
  let verifiedEmail: string;
  let verifiedToken: string;
  let unverifiedUserId: string;
  let unverifiedToken: string;

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";
    process.env.KEY_FETCH_LIMIT_PER_USER = "10";
    process.env.KEY_FETCH_LIMIT_PER_IP = "1000";

    const passwordHash = await hashPassword("password12345");

    verifiedEmail = `keys-verified-${randomUUID()}@example.com`;
    const verifiedInsert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, email_verified_at)
       VALUES ($1, $2, now()) RETURNING id`,
      [verifiedEmail, passwordHash]
    );
    verifiedUserId = verifiedInsert.rows[0]!.id;
    verifiedToken = createSessionToken(verifiedUserId, verifiedEmail);
    await pool.query(`INSERT INTO configs (user_id) VALUES ($1)`, [verifiedUserId]);

    const unverifiedEmail = `keys-unverified-${randomUUID()}@example.com`;
    const unverifiedInsert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [unverifiedEmail, passwordHash]
    );
    unverifiedUserId = unverifiedInsert.rows[0]!.id;
    unverifiedToken = createSessionToken(unverifiedUserId, unverifiedEmail);
    await pool.query(`INSERT INTO configs (user_id) VALUES ($1)`, [unverifiedUserId]);
  });

  after(async () => {
    if (verifiedUserId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [verifiedUserId]);
    }
    if (unverifiedUserId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [unverifiedUserId]);
    }
  });

  it("requires authentication", async () => {
    const response = await app.request("/v1/keys");
    assert.equal(response.status, 401);
  });

  it("requires email verification", async () => {
    const response = await app.request("/v1/keys", {
      headers: { Authorization: `Bearer ${unverifiedToken}` },
    });
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, "EMAIL_NOT_VERIFIED");
  });

  it("returns 404 until keys are set", async () => {
    const response = await app.request("/v1/keys", {
      headers: { Authorization: `Bearer ${verifiedToken}` },
    });
    assert.equal(response.status, 404);
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, "KEYS_NOT_SET");
  });

  it("creates keys on first PUT and rejects duplicate setup", async () => {
    const setup = validSetupBody();
    const create = await app.request("/v1/keys", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(setup),
    });
    assert.equal(create.status, 201);

    const duplicate = await app.request("/v1/keys", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(setup),
    });
    assert.equal(duplicate.status, 409);
    const dupBody = (await duplicate.json()) as { error: string };
    assert.equal(dupBody.error, "KEYS_ALREADY_SET");

    const get = await app.request("/v1/keys", {
      headers: { Authorization: `Bearer ${verifiedToken}` },
    });
    assert.equal(get.status, 200);
    const got = (await get.json()) as { keyVersion: number; salt: string };
    assert.equal(got.keyVersion, 1);
    assert.equal(got.salt, setup.salt);
  });

  it("validates payload sizes", async () => {
    const badSaltUser = `keys-bad-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password12345");
    const insert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, email_verified_at)
       VALUES ($1, $2, now()) RETURNING id`,
      [badSaltUser, passwordHash]
    );
    const userId = insert.rows[0]!.id;
    const token = createSessionToken(userId, badSaltUser);

    const response = await app.request("/v1/keys", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validSetupBody({ salt: b64(4) })),
    });
    assert.equal(response.status, 400);

    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  });

  it("rewrap checks key version and dek verifier", async () => {
    const wrongVersion = await app.request("/v1/keys/rewrap", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyVersion: 99,
        dekVerifier: "c".repeat(DEK_VERIFIER_HEX_LENGTH),
        kdfParams: { m: 64 * 1024 * 1024, t: 3, p: 1 },
        salt: b64(SALT_BYTES),
        passWrap: { nonce: b64(NONCE_BYTES), ct: b64(WRAPPED_DEK_BYTES) },
      }),
    });
    assert.equal(wrongVersion.status, 409);

    const wrongVerifier = await app.request("/v1/keys/rewrap", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyVersion: 1,
        dekVerifier: "d".repeat(DEK_VERIFIER_HEX_LENGTH),
        kdfParams: { m: 64 * 1024 * 1024, t: 3, p: 1 },
        salt: b64(SALT_BYTES),
        passWrap: { nonce: b64(NONCE_BYTES), ct: b64(WRAPPED_DEK_BYTES) },
      }),
    });
    assert.equal(wrongVerifier.status, 403);

    const ok = await app.request("/v1/keys/rewrap", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyVersion: 1,
        dekVerifier: "c".repeat(DEK_VERIFIER_HEX_LENGTH),
        kdfParams: { m: 64 * 1024 * 1024, t: 3, p: 1 },
        salt: b64(SALT_BYTES),
        passWrap: { nonce: b64(NONCE_BYTES), ct: b64(48) },
      }),
    });
    assert.equal(ok.status, 200);
  });

  it("recovery rotation checks verifier and updates wrap", async () => {
    const bad = await app.request("/v1/keys/recovery", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyVersion: 1,
        dekVerifier: "e".repeat(DEK_VERIFIER_HEX_LENGTH),
        recoveryWrap: { nonce: b64(NONCE_BYTES), ct: b64(WRAPPED_DEK_BYTES) },
      }),
    });
    assert.equal(bad.status, 403);

    const before = await app.request("/v1/keys", {
      headers: { Authorization: `Bearer ${verifiedToken}` },
    });
    const beforeBody = (await before.json()) as {
      recoveryWrap: { ct: string };
    };

    const ok = await app.request("/v1/keys/recovery", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyVersion: 1,
        dekVerifier: "c".repeat(DEK_VERIFIER_HEX_LENGTH),
        recoveryWrap: {
          nonce: b64(NONCE_BYTES),
          ct: Buffer.alloc(WRAPPED_DEK_BYTES, 9).toString("base64"),
        },
      }),
    });
    assert.equal(ok.status, 200);
    const afterBody = (await ok.json()) as { recoveryWrap: { ct: string } };
    assert.notEqual(afterBody.recoveryWrap.ct, beforeBody.recoveryWrap.ct);
  });

  it("rate limits GET /v1/keys", async () => {
    const rateUserEmail = `keys-rate-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password12345");
    const insert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, email_verified_at)
       VALUES ($1, $2, now()) RETURNING id`,
      [rateUserEmail, passwordHash]
    );
    const userId = insert.rows[0]!.id;
    const token = createSessionToken(userId, rateUserEmail);
    await pool.query(`INSERT INTO configs (user_id) VALUES ($1)`, [userId]);

    process.env.KEY_FETCH_LIMIT_PER_USER = "3";

    for (let i = 0; i < 3; i++) {
      const res = await app.request("/v1/keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 404);
    }

    const limited = await app.request("/v1/keys", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get("retry-after"));

    process.env.KEY_FETCH_LIMIT_PER_USER = "10";
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  });

  it("audit logs fetches without key bytes", async () => {
    const info = mock.method(console, "info", () => {});
    await app.request("/v1/keys", {
      headers: { Authorization: `Bearer ${verifiedToken}` },
    });

    const calls = info.mock.calls.map((call) => String(call.arguments[0]));
    assert.ok(calls.some((line) => line.includes("key_material_fetch")));
    for (const line of calls) {
      assert.ok(!line.includes(validSetupBody().salt));
      assert.ok(!line.includes(validSetupBody().passWrap.ct));
    }
    info.mock.restore();
  });
});
