import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { pool } from "../db/pool.js";
import { hashPassword } from "../lib/password.js";
import { createSessionToken } from "../lib/session.js";
import { app } from "../test/app.js";
import { ensureRevokedSessionTokensTable } from "../test/revoked-session-tokens-schema.js";

const databaseUrl = process.env.DATABASE_URL;

describe("POST /auth/logout", { skip: !databaseUrl }, () => {
  let userId: string;
  let otherUserId: string;
  let userEmail: string;
  let sessionToken: string;
  let otherSessionToken: string;

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";
    await ensureRevokedSessionTokensTable(pool);

    userEmail = `logout-${randomUUID()}@example.com`;
    const otherEmail = `logout-other-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password12345");

    const insert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [userEmail, passwordHash]
    );
    userId = insert.rows[0]!.id;

    const otherInsert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [otherEmail, passwordHash]
    );
    otherUserId = otherInsert.rows[0]!.id;

    await pool.query(
      `INSERT INTO configs (user_id) VALUES ($1), ($2)`,
      [userId, otherUserId]
    );

    sessionToken = createSessionToken(userId, userEmail);
    otherSessionToken = createSessionToken(otherUserId, otherEmail);
  });

  after(async () => {
    if (userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
    if (otherUserId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [otherUserId]);
    }
  });

  it("returns 401 without a bearer token", async () => {
    const response = await app.request("/auth/logout", { method: "POST" });
    assert.equal(response.status, 401);
  });

  it("returns 204 for an unknown or invalid token without revealing validity", async () => {
    const response = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer not-a-valid-jwt" },
    });
    assert.equal(response.status, 204);
  });

  it("revokes the session and rejects it on protected routes", async () => {
    const configsBefore = await app.request("/configs", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert.equal(configsBefore.status, 200);

    const logout = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert.equal(logout.status, 204);

    const configsAfter = await app.request("/configs", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert.equal(configsAfter.status, 401);

    const storageAfter = await app.request("/v1/storage/credentials", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(storageAfter.status, 401);

    const logoutAgain = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert.equal(logoutAgain.status, 204);
  });

  it("leaves another session for the same user valid", async () => {
    const secondToken = createSessionToken(userId, userEmail);

    const logoutFirst = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert.equal(logoutFirst.status, 204);

    const configsSecond = await app.request("/configs", {
      headers: { Authorization: `Bearer ${secondToken}` },
    });
    assert.equal(configsSecond.status, 200);
  });

  it("does not revoke unrelated users", async () => {
    const configsOther = await app.request("/configs", {
      headers: { Authorization: `Bearer ${otherSessionToken}` },
    });
    assert.equal(configsOther.status, 200);
  });
});
