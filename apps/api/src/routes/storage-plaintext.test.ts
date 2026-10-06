import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { hashPassword } from "../lib/password.js";
import { pool } from "../db/pool.js";
import { createSessionToken } from "../lib/session.js";
import { app } from "../test/app.js";

const databaseUrl = process.env.DATABASE_URL;

describe("plaintext object storage routes", { skip: !databaseUrl }, () => {
  let userId: string;
  let token: string;
  const savedEnv: Record<string, string | undefined> = {};

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";
    for (const key of [
      "CLOUDFLARE_ACCOUNT_ID",
      "R2_BUCKET",
      "R2_PARENT_ACCESS_KEY_ID",
      "R2_PARENT_SECRET_ACCESS_KEY",
      "CLOUDFLARE_API_TOKEN",
    ]) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }

    const email = `storage-plain-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password12345");
    const insert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, email_verified_at)
       VALUES ($1, $2, now()) RETURNING id`,
      [email, passwordHash]
    );
    userId = insert.rows[0]!.id;
    token = createSessionToken(userId, email);
  });

  after(async () => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    if (userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
  });

  it("returns 503 when R2 is not configured", async () => {
    const list = await app.request("/v1/storage/plaintext-objects", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(list.status, 503);

    const del = await app.request("/v1/storage/plaintext-objects/delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys: ["settings.json"] }),
    });
    assert.equal(del.status, 503);
  });
});
