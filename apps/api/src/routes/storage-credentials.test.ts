import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, describe, it } from "node:test";
import { pool } from "../db/pool.js";
import { hashPassword } from "../lib/password.js";
import { R2_TEMP_CREDENTIALS_MAX_TTL_SECONDS } from "../lib/r2.js";
import { createSessionToken } from "../lib/session.js";
import { app } from "../test/app.js";

const databaseUrl = process.env.DATABASE_URL;

describe("POST /v1/storage/credentials", { skip: !databaseUrl }, () => {
  let verifiedUserId: string;
  let verifiedToken: string;
  let unverifiedToken: string;
  const savedEnv: Record<string, string | undefined> = {};
  let originalFetch: typeof fetch;

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";

    const passwordHash = await hashPassword("password12345");

    const verifiedEmail = `storage-cred-verified-${randomUUID()}@example.com`;
    const verifiedInsert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, email_verified_at)
       VALUES ($1, $2, now()) RETURNING id`,
      [verifiedEmail, passwordHash]
    );
    verifiedUserId = verifiedInsert.rows[0]!.id;
    verifiedToken = createSessionToken(verifiedUserId, verifiedEmail);

    const unverifiedEmail = `storage-cred-unverified-${randomUUID()}@example.com`;
    const unverifiedInsert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [unverifiedEmail, passwordHash]
    );
    unverifiedToken = createSessionToken(
      unverifiedInsert.rows[0]!.id,
      unverifiedEmail
    );

    for (const key of [
      "CLOUDFLARE_ACCOUNT_ID",
      "R2_BUCKET",
      "R2_PARENT_ACCESS_KEY_ID",
      "R2_PARENT_SECRET_ACCESS_KEY",
      "CLOUDFLARE_API_TOKEN",
    ]) {
      savedEnv[key] = process.env[key];
      process.env[key] = `test-${key}`;
    }

    originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          success: true,
          result: {
            accessKeyId: "temp-key",
            secretAccessKey: "temp-secret",
            sessionToken: "session-token",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          success: true,
          result: {
            accessKeyId: "temp-key",
            secretAccessKey: "temp-secret",
            sessionToken: "session-token",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
  });

  after(async () => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    globalThis.fetch = originalFetch;
    if (verifiedUserId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [verifiedUserId]);
    }
  });

  it("requires email verification", async () => {
    const response = await app.request("/v1/storage/credentials", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${unverifiedToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, "EMAIL_NOT_VERIFIED");
  });

  it("rejects ttlSeconds above the Cloudflare maximum without calling upstream", async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify({ success: false }), { status: 400 });
    };

    const response = await app.request("/v1/storage/credentials", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttlSeconds: 999_999 }),
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error: string };
    assert.match(body.error, new RegExp(String(R2_TEMP_CREDENTIALS_MAX_TTL_SECONDS)));
    assert.equal(fetchCalled, false);
  });

  it("mints credentials for verified users when ttlSeconds is valid", async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            accessKeyId: "temp-key",
            secretAccessKey: "temp-secret",
            sessionToken: "session-token",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const response = await app.request("/v1/storage/credentials", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${verifiedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttlSeconds: 900 }),
    });
    assert.equal(response.status, 200);
    assert.equal(fetchCalled, true);
  });
});