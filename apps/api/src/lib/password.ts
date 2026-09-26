import argon2 from "argon2";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$Cf7KMKUECrkDn5Sy29vM+g$oqZTjGxJyt6ChDXIyJ1Du1HxMCfX8vUBucRGywyvpAo";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function verifyLoginPassword(
  passwordHash: string | null,
  password: string
): Promise<boolean> {
  if (!passwordHash) {
    await verifyPassword(DUMMY_PASSWORD_HASH, password);
    return false;
  }
  return verifyPassword(passwordHash, password);
}
