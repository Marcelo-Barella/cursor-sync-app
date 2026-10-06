import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { verifySessionToken, type SessionPayload } from "./session.js";

export function hashSessionToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function sessionExpiresAt(rawToken: string): Date {
  const decoded = jwt.decode(rawToken) as jwt.JwtPayload | null;
  if (typeof decoded?.exp === "number") {
    return new Date(decoded.exp * 1000);
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export async function revokeSessionTokenIfValid(rawToken: string): Promise<void> {
  let payload: SessionPayload;
  try {
    payload = verifySessionToken(rawToken);
  } catch {
    return;
  }

  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = sessionExpiresAt(rawToken);

  await pool.query(
    `INSERT INTO revoked_session_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (token_hash) DO NOTHING`,
    [tokenHash, payload.sub, expiresAt]
  );
}

export async function isSessionTokenRevoked(rawToken: string): Promise<boolean> {
  const tokenHash = hashSessionToken(rawToken);
  const result = await pool.query(
    `SELECT 1 FROM revoked_session_tokens
     WHERE token_hash = $1 AND expires_at > now()
     LIMIT 1`,
    [tokenHash]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function verifyActiveSessionToken(
  rawToken: string
): Promise<SessionPayload> {
  const payload = verifySessionToken(rawToken);
  if (await isSessionTokenRevoked(rawToken)) {
    throw new Error("Session revoked");
  }
  return payload;
}
