-- E2E sync key material (opaque ciphertext only; one row per user).

CREATE TABLE IF NOT EXISTS user_key_material (
  user_id                 uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  key_version             int NOT NULL DEFAULT 1 CHECK (key_version >= 1),
  kdf                     text NOT NULL,
  kdf_params              jsonb NOT NULL,
  salt                    bytea NOT NULL,
  pass_wrap_nonce         bytea NOT NULL,
  pass_wrapped_dek        bytea NOT NULL,
  recovery_wrap_nonce     bytea NOT NULL,
  recovery_wrapped_dek    bytea NOT NULL,
  dek_verifier            text NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS key_material_fetch_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip          text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS key_material_fetch_events_user_created_idx
  ON key_material_fetch_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS key_material_fetch_events_ip_created_idx
  ON key_material_fetch_events (ip, created_at DESC);
