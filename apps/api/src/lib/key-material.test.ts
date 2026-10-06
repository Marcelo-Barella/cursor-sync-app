import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEK_VERIFIER_HEX_LENGTH,
  NONCE_BYTES,
  SALT_BYTES,
  WRAPPED_DEK_BYTES,
  dekVerifiersMatch,
  parseSetupBody,
  setupBodySchema,
} from "./key-material.js";

function b64(bytes: number): string {
  return Buffer.alloc(bytes, 1).toString("base64");
}

function validSetup() {
  const dekVerifier = "a".repeat(DEK_VERIFIER_HEX_LENGTH);
  return {
    keyVersion: 1 as const,
    kdf: "argon2id" as const,
    kdfParams: { m: 64 * 1024 * 1024, t: 3, p: 1 },
    salt: b64(SALT_BYTES),
    passWrap: { nonce: b64(NONCE_BYTES), ct: b64(WRAPPED_DEK_BYTES) },
    recoveryWrap: { nonce: b64(NONCE_BYTES), ct: b64(WRAPPED_DEK_BYTES) },
    dekVerifier,
  };
}

describe("key-material validation", () => {
  it("accepts a valid setup payload", () => {
    const parsed = setupBodySchema.parse(validSetup());
    const material = parseSetupBody(parsed);
    assert.equal(material.salt.length, SALT_BYTES);
    assert.equal(material.passWrap.ct.length, WRAPPED_DEK_BYTES);
  });

  it("rejects wrong salt length", () => {
    const body = validSetup();
    body.salt = b64(8);
    assert.throws(() => parseSetupBody(setupBodySchema.parse(body)));
  });

  it("compares dek verifiers in constant time shape", () => {
    const v = "a".repeat(DEK_VERIFIER_HEX_LENGTH);
    assert.equal(dekVerifiersMatch(v, v), true);
    assert.equal(
      dekVerifiersMatch(v, "b".repeat(DEK_VERIFIER_HEX_LENGTH)),
      false
    );
  });
});
