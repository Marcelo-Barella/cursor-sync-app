import jwt from "jsonwebtoken";

const JWT_EXPIRY = "7d";

const INSECURE_JWT_SECRETS = new Set([
  "dev-secret-change-in-production",
  "change-me-to-a-long-random-string",
]);

export type SessionPayload = {
  sub: string;
  email: string;
};

function resolveSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  if (INSECURE_JWT_SECRETS.has(secret)) {
    throw new Error("JWT_SECRET must be set to a secure random value");
  }
  return secret;
}

export function assertJwtSecretConfigured(): void {
  resolveSecret();
}

function getSecret(): string {
  return resolveSecret();
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
