-- Additive E2E key material (staging). DBA-owned.
-- All key columns are opaque client-side ciphertext/params. The server never
-- stores a passphrase, recovery key, KEK, or plaintext DEK.
-- Idempotent: safe as a db/init script and as a psql apply on an existing DB.

BEGIN;

CREATE TABLE IF NOT EXISTS user_key_material (
  user_id              uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  key_version          integer NOT NULL DEFAULT 1 CHECK (key_version >= 1),
  kdf                  text    NOT NULL DEFAULT 'argon2id' CHECK (kdf = 'argon2id'),
  kdf_params           jsonb   NOT NULL
    CHECK (jsonb_typeof(kdf_params) = 'object' AND kdf_params ?& ARRAY['m', 't', 'p']),
  salt                 bytea   NOT NULL CHECK (octet_length(salt) >= 16),
  pass_wrap_nonce      bytea   NOT NULL CHECK (octet_length(pass_wrap_nonce) = 12),
  pass_wrapped_dek     bytea   NOT NULL CHECK (octet_length(pass_wrapped_dek) > 0),
  recovery_wrap_nonce  bytea   NOT NULL CHECK (octet_length(recovery_wrap_nonce) = 12),
  recovery_wrapped_dek bytea   NOT NULL CHECK (octet_length(recovery_wrapped_dek) > 0),
  dek_verifier         text    NOT NULL CHECK (dek_verifier ~ '^[0-9a-f]{64}$'),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- GET /v1/keys audit + rate limit (per user and per IP, 15-min windows).
-- Never store key bytes here.
CREATE TABLE IF NOT EXISTS key_fetch_audit (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip         inet,
  status     smallint NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS key_fetch_audit_user_fetched_at_idx
  ON key_fetch_audit (user_id, fetched_at);

CREATE INDEX IF NOT EXISTS key_fetch_audit_ip_fetched_at_idx
  ON key_fetch_audit (ip, fetched_at);

-- Encrypted /configs manifest (raw CSE1 envelope bytes, syncKey "__manifest__").
-- Min size 36 = magic 4 + key_version 4 + nonce 12 + GCM tag 16.
-- payload jsonb stays for legacy plaintext until clients finish migrating.
ALTER TABLE configs
  ADD COLUMN IF NOT EXISTS manifest_ciphertext bytea
    CHECK (manifest_ciphertext IS NULL
           OR (octet_length(manifest_ciphertext) >= 36
               AND substring(manifest_ciphertext FROM 1 FOR 4) = '\x43534531'::bytea));

ALTER TABLE configs
  ADD COLUMN IF NOT EXISTS manifest_version bigint NOT NULL DEFAULT 0
    CHECK (manifest_version >= 0);

COMMIT;
