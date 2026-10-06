import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const MIN_SALT_BYTES = 16;
export const NONCE_BYTES = 12;
export const DEK_VERIFIER_HEX_LENGTH = 64;

const MIN_ARGON_M = 16 * 1024 * 1024;
const MAX_ARGON_M = 256 * 1024 * 1024;

const lowercaseHex64 = /^[0-9a-f]{64}$/;

export const kdfParamsSchema = z.object({
  m: z.number().int().min(MIN_ARGON_M).max(MAX_ARGON_M),
  t: z.number().int().min(1).max(10),
  p: z.number().int().min(1).max(4),
});

export const wrapSchema = z.object({
  nonce: z.string().min(1),
  ct: z.string().min(1),
});

export const setupBodySchema = z.object({
  keyVersion: z.literal(1),
  kdf: z.literal("argon2id"),
  kdfParams: kdfParamsSchema,
  salt: z.string().min(1),
  passWrap: wrapSchema,
  recoveryWrap: wrapSchema,
  dekVerifier: z.string().regex(lowercaseHex64),
});

export const rewrapBodySchema = z.object({
  keyVersion: z.number().int().min(1),
  dekVerifier: z.string().regex(lowercaseHex64),
  kdfParams: kdfParamsSchema,
  salt: z.string().min(1),
  passWrap: wrapSchema,
});

export const recoveryBodySchema = z.object({
  keyVersion: z.number().int().min(1),
  dekVerifier: z.string().regex(lowercaseHex64),
  recoveryWrap: wrapSchema,
});

export type ParsedWrap = {
  nonce: Buffer;
  ct: Buffer;
};

export type ParsedSetup = {
  keyVersion: number;
  kdf: "argon2id";
  kdfParams: z.infer<typeof kdfParamsSchema>;
  salt: Buffer;
  passWrap: ParsedWrap;
  recoveryWrap: ParsedWrap;
  dekVerifier: string;
};

function decodeBase64(value: string, field: string): Buffer {
  try {
    return Buffer.from(value, "base64");
  } catch {
    throw new KeyMaterialValidationError(`Invalid base64 for ${field}`);
  }
}

function decodeNonce(value: string, field: string): Buffer {
  const buf = decodeBase64(value, field);
  if (buf.length !== NONCE_BYTES) {
    throw new KeyMaterialValidationError(
      `Invalid length for ${field}: expected ${NONCE_BYTES} bytes`
    );
  }
  return buf;
}

function decodeWrapCt(value: string, field: string): Buffer {
  const buf = decodeBase64(value, field);
  if (buf.length === 0) {
    throw new KeyMaterialValidationError(`Invalid length for ${field}: wrap must be non-empty`);
  }
  return buf;
}

function decodeSalt(value: string): Buffer {
  const buf = decodeBase64(value, "salt");
  if (buf.length < MIN_SALT_BYTES) {
    throw new KeyMaterialValidationError(
      `Invalid length for salt: expected at least ${MIN_SALT_BYTES} bytes`
    );
  }
  return buf;
}

export class KeyMaterialValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeyMaterialValidationError";
  }
}

function parseWrap(wrap: z.infer<typeof wrapSchema>, label: string): ParsedWrap {
  return {
    nonce: decodeNonce(wrap.nonce, `${label}.nonce`),
    ct: decodeWrapCt(wrap.ct, `${label}.ct`),
  };
}

export function parseSetupBody(body: z.infer<typeof setupBodySchema>): ParsedSetup {
  return {
    keyVersion: body.keyVersion,
    kdf: body.kdf,
    kdfParams: body.kdfParams,
    salt: decodeSalt(body.salt),
    passWrap: parseWrap(body.passWrap, "passWrap"),
    recoveryWrap: parseWrap(body.recoveryWrap, "recoveryWrap"),
    dekVerifier: body.dekVerifier,
  };
}

export function parseRewrapBody(body: z.infer<typeof rewrapBodySchema>) {
  return {
    keyVersion: body.keyVersion,
    dekVerifier: body.dekVerifier,
    kdfParams: body.kdfParams,
    salt: decodeSalt(body.salt),
    passWrap: parseWrap(body.passWrap, "passWrap"),
  };
}

export function parseRecoveryBody(body: z.infer<typeof recoveryBodySchema>) {
  return {
    keyVersion: body.keyVersion,
    dekVerifier: body.dekVerifier,
    recoveryWrap: parseWrap(body.recoveryWrap, "recoveryWrap"),
  };
}

export function dekVerifiersMatch(stored: string, provided: string): boolean {
  const a = Buffer.from(stored, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function rowToKeyResponse(row: {
  key_version: number;
  kdf: string;
  kdf_params: { m: number; t: number; p: number };
  salt: Buffer;
  pass_wrap_nonce: Buffer;
  pass_wrapped_dek: Buffer;
  recovery_wrap_nonce: Buffer;
  recovery_wrapped_dek: Buffer;
}) {
  return {
    keyVersion: row.key_version,
    kdf: row.kdf,
    kdfParams: row.kdf_params,
    salt: row.salt.toString("base64"),
    passWrap: {
      nonce: row.pass_wrap_nonce.toString("base64"),
      ct: row.pass_wrapped_dek.toString("base64"),
    },
    recoveryWrap: {
      nonce: row.recovery_wrap_nonce.toString("base64"),
      ct: row.recovery_wrapped_dek.toString("base64"),
    },
  };
}
