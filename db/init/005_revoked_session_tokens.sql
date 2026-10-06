-- Additive session revocation denylist (staging / local compose init).
-- Sessions are stateless 7-day JWTs; POST /auth/logout records the token here
-- and requireAuth rejects any bearer whose hash is present.
-- Keyed by SHA-256 of the full bearer JWT (lowercase hex), not jti, so tokens
-- issued before jti existed can be revoked too. Never store the raw JWT.

CREATE TABLE IF NOT EXISTS revoked_session_tokens (
  token_hash  text PRIMARY KEY
                CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS revoked_session_tokens_user_id_idx
  ON revoked_session_tokens (user_id);

CREATE INDEX IF NOT EXISTS revoked_session_tokens_expires_at_idx
  ON revoked_session_tokens (expires_at);
