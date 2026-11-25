import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createApp } from "../create-app.js";

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

test("unset allowlist: cross-origin GET has no ACAO", async () => {
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  const app = createApp();
  const response = await app.request("/health", {
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  assert.notEqual(response.status, 403);
});

test("unset allowlist: cross-origin OPTIONS preflight is 403 without ACAO", async () => {
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  const app = createApp();
  const response = await app.request("/health", {
    method: "OPTIONS",
    headers: {
      Origin: "https://evil.example",
      "Access-Control-Request-Method": "GET",
    },
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("set allowlist: allowed origin receives ACAO", async () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://staging.cursor-sync.com";
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  const app = createApp();
  const response = await app.request("/health", {
    headers: { Origin: "https://staging.cursor-sync.com" },
  });
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://staging.cursor-sync.com"
  );
});

test("set allowlist: disallowed origin has no ACAO", async () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://staging.cursor-sync.com";
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  const app = createApp();
  const response = await app.request("/health", {
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("no Origin header succeeds without ACAO when allowlist unset", async () => {
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  const app = createApp();
  const response = await app.request("/health");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  assert.notEqual(response.status, 403);
});