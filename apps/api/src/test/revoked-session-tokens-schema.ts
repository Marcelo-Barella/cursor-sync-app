import type { Pool } from "pg";

export const REVOKED_SESSION_TOKENS_DDL = `
CREATE TABLE IF NOT EXISTS revoked_session_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS revoked_session_tokens_expires_at_idx
  ON revoked_session_tokens (expires_at);
`;

export async function ensureRevokedSessionTokensTable(pool: Pool): Promise<void> {
  await pool.query(REVOKED_SESSION_TOKENS_DDL);
}
