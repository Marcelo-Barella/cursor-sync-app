import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { resolveCorsOrigin } from "./cors.js";

const original = process.env.CORS_ALLOWED_ORIGINS;

afterEach(() => {
  if (original === undefined) {
    delete process.env.CORS_ALLOWED_ORIGINS;
  } else {
    process.env.CORS_ALLOWED_ORIGINS = original;
  }
});

test("reflects request origin when allowlist env is unset", () => {
  delete process.env.CORS_ALLOWED_ORIGINS;
  assert.equal(
    resolveCorsOrigin("https://staging.cursor-sync.com"),
    "https://staging.cursor-sync.com"
  );
  assert.equal(resolveCorsOrigin(undefined), "*");
});

test("allows only configured origins when allowlist env is set", () => {
  process.env.CORS_ALLOWED_ORIGINS =
    "https://staging.cursor-sync.com,http://localhost:3000";
  assert.equal(
    resolveCorsOrigin("https://staging.cursor-sync.com"),
    "https://staging.cursor-sync.com"
  );
  assert.equal(resolveCorsOrigin("https://evil.example"), null);
});
