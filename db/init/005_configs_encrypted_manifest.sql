-- Opaque encrypted sync manifest (extension-held DEK; server stores blob + etag only).

ALTER TABLE configs
  ADD COLUMN IF NOT EXISTS encrypted_manifest bytea,
  ADD COLUMN IF NOT EXISTS manifest_etag text;
