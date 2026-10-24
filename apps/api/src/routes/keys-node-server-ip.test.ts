import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { serve } from "@hono/node-server";
import { hashPassword } from "../lib/password.js";
import { pool } from "../db/pool.js";
import { createSessionToken } from "../lib/session.js";
import { app } from "../test/app.js";

const databaseUrl = process.env.DATABASE_URL;

describe("GET /v1/keys client IP via node server", { skip: !databaseUrl }, () => {
  let userId: string;
  let token: string;
  let baseUrl: string;
  let server: ReturnType<typeof serve>;

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";
    process.env.TRUSTED_PROXY_HOPS = "1";

    const email = `keys-conninfo-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password12345");
    const insert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, email_verified_at)
       VALUES ($1, $2, now()) RETURNING id`,
      [email, passwordHash]
    );
    userId = insert.rows[0]!.id;
    token = createSessionToken(userId, email);

    server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
    await new Promise<void>((resolve) => {
      server.once("listening", () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    server?.close();
    if (userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
  });

  it("records loopback in key_fetch_audit from the real socket peer", async () => {
    const response = await fetch(`${baseUrl}/v1/keys`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 404);

    const audit = await pool.query<{ ip: string | null }>(
      `SELECT host(ip) AS ip FROM key_fetch_audit
       WHERE user_id = $1
       ORDER BY fetched_at DESC
       LIMIT 1`,
      [userId]
    );
    const recorded = audit.rows[0]?.ip;
    assert.ok(recorded === "127.0.0.1" || recorded === "::1");
  });

  it("uses the socket peer when a spoofed XFF chain ends with the real hop", async () => {
    const peer = await pool.query<{ ip: string | null }>(
      `SELECT host(ip) AS ip FROM key_fetch_audit
       WHERE user_id = $1 AND ip IS NOT NULL
       ORDER BY fetched_at DESC
       LIMIT 1`,
      [userId]
    );
    const loopback = peer.rows[0]?.ip;
    assert.ok(loopback === "127.0.0.1" || loopback === "::1");

    const response = await fetch(`${baseUrl}/v1/keys`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Forwarded-For": `203.0.113.55, ${loopback}`,
      },
    });
    assert.equal(response.status, 404);

    const audit = await pool.query<{ ip: string | null }>(
      `SELECT host(ip) AS ip FROM key_fetch_audit
       WHERE user_id = $1
       ORDER BY fetched_at DESC
       LIMIT 1`,
      [userId]
    );
    assert.equal(audit.rows[0]?.ip, loopback);
  });
});
