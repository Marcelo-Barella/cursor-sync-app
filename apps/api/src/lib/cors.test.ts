import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { originMatchesAllowedPattern, resolveCorsOrigin } from "./cors.js";

const originalOrigins = process.env.CORS_ALLOWED_ORIGINS;
const originalPatterns = process.env.CORS_ALLOWED_ORIGIN_PATTERNS;

afterEach(() => {
  if (originalOrigins === undefined) {
    delete process.env.CORS_ALLOWED_ORIGINS;
  } else {
    process.env.CORS_ALLOWED_ORIGINS = originalOrigins;
  }
  if (originalPatterns === undefined) {
    delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  } else {
    process.env.CORS_ALLOWED_ORIGIN_PATTERNS = originalPatterns;
  }
});

test("reflects request origin when allowlist env is unset", () => {
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  assert.equal(
    resolveCorsOrigin("https://staging.cursor-sync.com"),
    "https://staging.cursor-sync.com"
  );
  assert.equal(resolveCorsOrigin(undefined), "*");
});

test("allows only configured origins when allowlist env is set", () => {
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  process.env.CORS_ALLOWED_ORIGINS =
    "https://staging.cursor-sync.com,http://localhost:3000";
  assert.equal(
    resolveCorsOrigin("https://staging.cursor-sync.com"),
    "https://staging.cursor-sync.com"
  );
  assert.equal(resolveCorsOrigin("https://evil.example"), null);
});

test("allows Vercel preview origins when origin patterns env is set", () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://staging.cursor-sync.com";
  process.env.CORS_ALLOWED_ORIGIN_PATTERNS =
    "*-marcelo-barellas-projects.vercel.app";
  assert.equal(
    resolveCorsOrigin(
      "https://cursor-sync-app-git-feature-marcelo-barellas-projects.vercel.app"
    ),
    "https://cursor-sync-app-git-feature-marcelo-barellas-projects.vercel.app"
  );
  assert.equal(
    resolveCorsOrigin(
      "https://cursor-sync-abc123-marcelo-barellas-projects.vercel.app"
    ),
    "https://cursor-sync-abc123-marcelo-barellas-projects.vercel.app"
  );
});

test("denies lookalike and non-https origins for patterns", () => {
  const pattern = "*-marcelo-barellas-projects.vercel.app";
  process.env.CORS_ALLOWED_ORIGINS = "https://staging.cursor-sync.com";
  process.env.CORS_ALLOWED_ORIGIN_PATTERNS = pattern;
  assert.equal(
    originMatchesAllowedPattern(
      "https://evil-marcelo-barellas-projects.vercel.app.attacker.com",
      pattern
    ),
    false
  );
  assert.equal(
    originMatchesAllowedPattern(
      "http://cursor-sync-abc123-marcelo-barellas-projects.vercel.app",
      pattern
    ),
    false
  );
  assert.equal(
    resolveCorsOrigin(
      "https://evil-marcelo-barellas-projects.vercel.app.attacker.com"
    ),
    null
  );
});

test("ignores origin patterns when env is unset", () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://staging.cursor-sync.com";
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  assert.equal(
    resolveCorsOrigin(
      "https://cursor-sync-abc123-marcelo-barellas-projects.vercel.app"
    ),
    null
  );
});
