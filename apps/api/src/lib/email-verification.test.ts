import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashEmailVerificationToken,
  isEmailVerified,
} from "./email-verification.js";

describe("email verification helpers", () => {
  it("hashes tokens deterministically with SHA-256 hex", () => {
    const raw = "test-token-value";
    const first = hashEmailVerificationToken(raw);
    const second = hashEmailVerificationToken(raw);
    assert.equal(first, second);
    assert.match(first, /^[a-f0-9]{64}$/);
    assert.notEqual(first, hashEmailVerificationToken("other"));
  });

  it("reports verified only when email_verified_at is set", () => {
    assert.equal(isEmailVerified(null), false);
    assert.equal(isEmailVerified(undefined), false);
    assert.equal(isEmailVerified(new Date()), true);
    assert.equal(isEmailVerified("2026-01-01T00:00:00.000Z"), true);
  });
});
