import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import pg from "pg";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const initDir = path.join(repoRoot, "db/init");

function psqlAvailable(): boolean {
  try {
    execSync("command -v psql", { stdio: "ignore" });
    execSync("sudo -n -u postgres psql -c 'SELECT 1'", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runPsqlDb(dbName: string, sqlFile: string): void {
  execSync(
    `sudo -u postgres psql -v ON_ERROR_STOP=1 -d ${dbName} -f ${sqlFile}`,
    { stdio: "pipe" }
  );
}

function runPsqlAdmin(sql: string): void {
  execSync(`sudo -u postgres psql -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql)}`, {
    stdio: "pipe",
  });
}

function grantCursorSync(dbName: string): void {
  runPsqlAdmin(
    `GRANT ALL ON ALL TABLES IN SCHEMA public TO cursor_sync; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO cursor_sync; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cursor_sync;`
  );
  execSync(
    `sudo -u postgres psql -v ON_ERROR_STOP=1 -d ${dbName} -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO cursor_sync; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO cursor_sync;"`,
    { stdio: "pipe" }
  );
}

const canRun = psqlAvailable();

describe("postgres init scripts 001-004", { skip: !canRun }, () => {
  const dbName = `cursor_sync_init_${Date.now()}`;
  let pool: pg.Pool;

  after(async () => {
    await pool?.end().catch(() => undefined);
    runPsqlAdmin(`DROP DATABASE IF EXISTS ${dbName}`);
  });

  it("applies 001-003 then 004 twice idempotently", () => {
    runPsqlAdmin(`DROP DATABASE IF EXISTS ${dbName}`);
    runPsqlAdmin(`CREATE DATABASE ${dbName} OWNER cursor_sync`);

    const files = [
      "001_schema.sql",
      "002_login_codes.sql",
      "003_email_verification.sql",
      "004_e2e_keys.sql",
    ];
    for (const file of files) {
      runPsqlDb(dbName, path.join(initDir, file));
    }
    runPsqlDb(dbName, path.join(initDir, "004_e2e_keys.sql"));
    runPsqlDb(dbName, path.join(initDir, "004_e2e_keys.sql"));
    grantCursorSync(dbName);
  });

  it("enforces user_key_material and manifest CHECK constraints", async () => {
    pool = new pg.Pool({
      connectionString: `postgres://cursor_sync:cursor_sync@localhost:5432/${dbName}`,
    });

    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash)
       VALUES ('schema-check@example.com', 'hash') RETURNING id`
    );
    const userId = user.rows[0]!.id;

    const goodSalt = Buffer.alloc(16, 1);
    const goodNonce = Buffer.alloc(12, 2);
    const goodWrap = Buffer.alloc(48, 3);
    const dekVerifier = "a".repeat(64);

    await pool.query(
      `INSERT INTO user_key_material (
         user_id, key_version, kdf, kdf_params, salt,
         pass_wrap_nonce, pass_wrapped_dek,
         recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier
       ) VALUES ($1, 1, 'argon2id', $2::jsonb, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        JSON.stringify({ m: 67108864, t: 3, p: 1 }),
        goodSalt,
        goodNonce,
        goodWrap,
        goodNonce,
        goodWrap,
        dekVerifier,
      ]
    );

    const user2 = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash)
       VALUES ('schema-check-2@example.com', 'hash') RETURNING id`
    );
    const userId2 = user2.rows[0]!.id;

    await assert.rejects(
      pool.query(
        `INSERT INTO user_key_material (
           user_id, key_version, kdf, kdf_params, salt,
           pass_wrap_nonce, pass_wrapped_dek,
           recovery_wrap_nonce, recovery_wrapped_dek, dek_verifier
         ) VALUES ($1, 1, 'argon2id', $2::jsonb, $3, $4, $5, $6, $7, $8)`,
        [
          userId2,
          JSON.stringify({ m: 67108864, t: 3, p: 1 }),
          Buffer.alloc(8, 1),
          goodNonce,
          goodWrap,
          goodNonce,
          goodWrap,
          dekVerifier,
        ]
      )
    );

    await assert.rejects(
      pool.query(
        `UPDATE user_key_material SET dek_verifier = $2 WHERE user_id = $1`,
        [userId, "A".repeat(64)]
      )
    );

    await pool.query(`INSERT INTO configs (user_id) VALUES ($1)`, [userId]);

    const cse1 = Buffer.alloc(36, 0);
    cse1.write("CSE1", 0);
    await pool.query(
      `UPDATE configs SET manifest_ciphertext = $2, manifest_version = 1 WHERE user_id = $1`,
      [userId, cse1]
    );

    await assert.rejects(
      pool.query(
        `UPDATE configs SET manifest_ciphertext = $2 WHERE user_id = $1`,
        [userId, Buffer.alloc(36, 0)]
      )
    );

    await pool.query(
      `INSERT INTO key_fetch_audit (user_id, ip, status) VALUES ($1, '127.0.0.1'::inet, 200)`,
      [userId]
    );
    const audit = await pool.query(`SELECT count(*)::int AS n FROM key_fetch_audit`);
    assert.equal(audit.rows[0]?.n, 1);
  });
});
