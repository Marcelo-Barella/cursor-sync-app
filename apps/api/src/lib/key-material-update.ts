import type { Pool } from "pg";
import { dekVerifiersMatch } from "./key-material.js";

export type KeyMaterialUpdateFailure =
  | "KEYS_NOT_SET"
  | "KEY_VERSION_MISMATCH"
  | "DEK_VERIFIER_MISMATCH";

export async function classifyKeyMaterialUpdateFailure(
  pool: Pool,
  userId: string,
  expectedKeyVersion: number,
  providedDekVerifier: string
): Promise<KeyMaterialUpdateFailure> {
  const result = await pool.query<{ key_version: number; dek_verifier: string }>(
    `SELECT key_version, dek_verifier FROM user_key_material WHERE user_id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) {
    return "KEYS_NOT_SET";
  }
  if (row.key_version !== expectedKeyVersion) {
    return "KEY_VERSION_MISMATCH";
  }
  if (!dekVerifiersMatch(row.dek_verifier, providedDekVerifier)) {
    return "DEK_VERIFIER_MISMATCH";
  }
  return "KEY_VERSION_MISMATCH";
}
