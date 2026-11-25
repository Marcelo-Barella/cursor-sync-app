import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { pool } from "../db/pool.js";
import { hashPassword } from "../lib/password.js";
import { hashSessionToken } from "../lib/session-revocation.js";
import { createSessionToken } from "../lib/session.js";
import { app } from "../test/app.js";

const databaseUrl = process.env.DATABASE_URL;

describe("POST /auth/logout", { skip: !databaseUrl }, () => {
  let userId: string;
  let otherUserId: string;
  let userEmail: string;
  let sessionToken: string;
  let otherSessionToken: string;

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";

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

  it("rejects uppercase token_hash via CHECK constraint", async () => {
    const upper = "A".repeat(64);
    await assert.rejects(
      pool.query(
        `INSERT INTO revoked_session_tokens (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')`,
        [upper, userId]
      )
    );
  });

  it("purges expired rows on the next logout", async () => {
    const expiredHash = "b".repeat(64);
    await pool.query(
      `INSERT INTO revoked_session_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, now() - interval '1 hour')`,
      [expiredHash, userId]
    );

    const freshToken = createSessionToken(userId, userEmail);
    const logout = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.equal(logout.status, 204);

    const expiredRow = await pool.query(
      `SELECT 1 FROM revoked_session_tokens WHERE token_hash = $1`,
      [expiredHash]
    );
    assert.equal(expiredRow.rowCount, 0);

    const freshHash = hashSessionToken(freshToken);
    const revokedRow = await pool.query(
      `SELECT 1 FROM revoked_session_tokens WHERE token_hash = $1`,
      [freshHash]
    );
    assert.equal(revokedRow.rowCount, 1);
  });

  it("revokes the session and rejects it on protected routes", async () => {
    const token = createSessionToken(userId, userEmail);

    const configsBefore = await app.request("/configs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(configsBefore.status, 200);

    const logout = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logout.status, 204);

    const configsAfter = await app.request("/configs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(configsAfter.status, 401);

    const storageAfter = await app.request("/v1/storage/credentials", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(storageAfter.status, 401);

    const logoutAgain = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logoutAgain.status, 204);
  });

  it("leaves another session for the same user valid", async () => {
    const firstToken = createSessionToken(userId, userEmail);
    const secondToken = createSessionToken(userId, userEmail);

    const logoutFirst = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${firstToken}` },
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
