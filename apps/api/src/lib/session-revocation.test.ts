import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashSessionToken } from "./session-revocation.js";
import { createSessionToken } from "./session.js";

describe("hashSessionToken", () => {
  it("returns SHA-256 of the bearer JWT as lowercase hex", () => {
    process.env.JWT_SECRET ??= "test-jwt-secret-with-enough-length";
    const token = createSessionToken("00000000-0000-4000-8000-000000000001", "a@b.com");
    const hash = hashSessionToken(token);
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.ok(!/[A-F]/.test(hash));
  });
});
