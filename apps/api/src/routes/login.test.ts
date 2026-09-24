import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { hashPassword } from "../lib/password.js";
import { pool } from "../db/pool.js";
import {
  createLoginCode,
  exchangeLoginCode,
} from "../lib/login-codes.js";
import { createSessionToken } from "../lib/session.js";
import { app } from "../test/app.js";

const databaseUrl = process.env.DATABASE_URL;

describe("login code API", { skip: !databaseUrl }, () => {
  let userId: string;
  let userEmail: string;
  let sessionToken: string;
  const redirectUri = "cursor://MarceloBarella.cursor-sync/auth";

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";
    userEmail = `login-code-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password12345");
    const insert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [userEmail, passwordHash]
    );
    userId = insert.rows[0]!.id;
    await pool.query(`INSERT INTO configs (user_id) VALUES ($1)`, [userId]);
    sessionToken = createSessionToken(userId, userEmail);
  });

  after(async () => {
    if (userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
  });

  it("issues a login code for an authenticated session", async () => {
    const response = await app.request("/login/code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        redirect_uri: redirectUri,
        state: "state-123",
      }),
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      code: string;
      redirect_uri: string;
      state: string;
    };
    assert.ok(body.code.length > 20);
    assert.equal(body.redirect_uri, redirectUri);
    assert.equal(body.state, "state-123");
  });

  it("redeems a code at POST /auth/token", async () => {
    const code = await createLoginCode(userId);
    const response = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { token: string };
    assert.ok(body.token.length > 10);
  });

  it("rejects reuse of a redeemed code", async () => {
    const code = await createLoginCode(userId);
    const first = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    assert.equal(first.status, 200);

    const second = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    assert.equal(second.status, 400);
  });

  it("rejects expired codes", async () => {
    const code = `expired-${randomUUID()}`;
    await pool.query(
      `INSERT INTO login_codes (code, user_id, expires_at) VALUES ($1, $2, now() - interval '1 minute')`,
      [code, userId]
    );

    const result = await exchangeLoginCode(code);
    assert.equal(result, null);

    const response = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    assert.equal(response.status, 400);
  });

  it("rejects disallowed redirect_uri on code issue", async () => {
    const response = await app.request("/login/code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        redirect_uri: "https://evil.example/auth",
        state: "x",
      }),
    });
    assert.equal(response.status, 400);
  });
});
