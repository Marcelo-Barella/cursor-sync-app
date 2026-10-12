import type { Pool } from "pg";

export async function userHasKeyMaterial(pool: Pool, userId: string): Promise<boolean> {
  const result = await pool.query(`SELECT 1 FROM user_key_material WHERE user_id = $1 LIMIT 1`, [
    userId,
  ]);
  return result.rows.length > 0;
}
