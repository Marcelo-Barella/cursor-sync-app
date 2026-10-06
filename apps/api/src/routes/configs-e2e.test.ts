import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { pool } from "../db/pool.js";
import { hashPassword } from "../lib/password.js";
import { createSessionToken } from "../lib/session.js";
import { app } from "../test/app.js";

const databaseUrl = process.env.DATABASE_URL;

describe("configs encrypted manifest", { skip: !databaseUrl }, () => {
  let userId: string;
  let token: string;

  before(async () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";
    const email = `cfg-e2e-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password12345");
    const insert = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [email, passwordHash]
    );
    userId = insert.rows[0]!.id;
    token = createSessionToken(userId, email);
    await pool.query(`INSERT INTO configs (user_id) VALUES ($1)`, [userId]);
  });

  after(async () => {
    if (userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
  });

  it("stores opaque encrypted manifest with etag concurrency", async () => {
    const manifest = Buffer.from("opaque-cse1-blob").toString("base64");

    const first = await app.request("/configs", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encryptedManifest: manifest,
        expectedManifestEtag: null,
        clearLegacyPayload: true,
      }),
    });
    assert.equal(first.status, 200);
    const firstBody = (await first.json()) as {
      encryptedManifest: string;
      manifestEtag: string;
      payload: Record<string, unknown>;
    };
    assert.deepEqual(firstBody.payload, {});
    assert.ok(firstBody.manifestEtag);
    assert.equal(firstBody.encryptedManifest, manifest);

    const conflict = await app.request("/configs", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encryptedManifest: manifest,
        expectedManifestEtag: null,
      }),
    });
    assert.equal(conflict.status, 409);

    const second = await app.request("/configs", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encryptedManifest: Buffer.from("next-blob").toString("base64"),
        expectedManifestEtag: firstBody.manifestEtag,
      }),
    });
    assert.equal(second.status, 200);
    const secondBody = (await second.json()) as { manifestEtag: string };
    assert.notEqual(secondBody.manifestEtag, firstBody.manifestEtag);
  });

  it("still accepts legacy plaintext payload updates", async () => {
    const response = await app.request("/configs", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: { paths: { "settings.json": {} } } }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      payload: { paths: Record<string, unknown> };
    };
    assert.ok(body.payload.paths["settings.json"]);
  });
});
