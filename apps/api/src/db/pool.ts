import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  master_password: Buffer | null;
  secrets_version: number;
  created_at: Date;
  updated_at: Date;
};
