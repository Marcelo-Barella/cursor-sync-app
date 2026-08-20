import jwt from "jsonwebtoken";

const JWT_EXPIRY = "7d";

export type SessionPayload = {
  sub: string;
  email: string;
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
}

export function createSessionToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, getSecret(), {
    expiresIn: JWT_EXPIRY,
  });
}

export function verifySessionToken(token: string): SessionPayload {
  const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload;
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub: payload.sub, email: payload.email };
}

export const sessionExpiry = JWT_EXPIRY;
