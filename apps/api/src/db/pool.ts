import pg from "pg";

const { Pool } = pg;

const DB_CONNECT_TIMEOUT_MS = 3_000;
const DB_QUERY_TIMEOUT_MS = 3_000;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
});

pool.on("error", (err) => {
  console.error("postgres pool idle client error:", err.message);
});

export async function pingDatabase(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("database ping timeout")),
          DB_QUERY_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  master_password: Buffer | null;
  secrets_version: number;
  created_at: Date;
  updated_at: Date;
};
