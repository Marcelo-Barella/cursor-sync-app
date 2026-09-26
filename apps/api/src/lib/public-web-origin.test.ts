import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildEmailVerificationLink,
  getPublicWebOrigin,
} from "./public-web-origin.js";

describe("public web origin", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("reads PUBLIC_WEB_ORIGIN or WEB_ORIGIN without trailing slash", () => {
    process.env.PUBLIC_WEB_ORIGIN = "https://staging.example.com/";
    assert.equal(getPublicWebOrigin(), "https://staging.example.com");
    delete process.env.PUBLIC_WEB_ORIGIN;
    process.env.WEB_ORIGIN = "https://web.example.com";
    assert.equal(getPublicWebOrigin(), "https://web.example.com");
  });

  it("builds verify links under /auth/verify", () => {
    process.env.PUBLIC_WEB_ORIGIN = "https://staging.sync.example";
    const link = buildEmailVerificationLink("raw-token-abc");
    assert.equal(
      link,
      "https://staging.sync.example/auth/verify?token=raw-token-abc"
    );
  });
});
