import argon2 from "argon2";

const TIMING_DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$ipxVxj4XaRpUqVbRJ4215Q$ExcbKv+Admi4yrv6CspYoknoKE5CqpIpq61w4B9QXa8";

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
  storedHash: string | null,
  password: string
): Promise<boolean> {
  return verifyPassword(storedHash ?? TIMING_DUMMY_HASH, password);
}
