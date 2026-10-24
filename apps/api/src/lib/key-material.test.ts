import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEK_VERIFIER_HEX_LENGTH,
  MIN_SALT_BYTES,
  NONCE_BYTES,
  dekVerifiersMatch,
  parseSetupBody,
  setupBodySchema,
} from "./key-material.js";

function b64(bytes: number, fill = 1): string {
  return Buffer.alloc(bytes, fill).toString("base64");
}

function validSetup() {
  const dekVerifier = "a".repeat(DEK_VERIFIER_HEX_LENGTH);
  return {
    keyVersion: 1 as const,
    kdf: "argon2id" as const,
    kdfParams: { m: 64 * 1024 * 1024, t: 3, p: 1 },
    salt: b64(MIN_SALT_BYTES),
    passWrap: { nonce: b64(NONCE_BYTES), ct: b64(48) },
    recoveryWrap: { nonce: b64(NONCE_BYTES), ct: b64(48) },
    dekVerifier,
  };
}

describe("key-material validation", () => {
  it("accepts a valid setup payload", () => {
    const parsed = setupBodySchema.parse(validSetup());
    const material = parseSetupBody(parsed);
    assert.ok(material.salt.length >= MIN_SALT_BYTES);
    assert.ok(material.passWrap.ct.length > 0);
  });

  it("rejects uppercase dek verifier at the schema layer", () => {
    const body = validSetup();
    body.dekVerifier = "A".repeat(DEK_VERIFIER_HEX_LENGTH);
    assert.equal(setupBodySchema.safeParse(body).success, false);
  });

  it("rejects short salt", () => {
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
