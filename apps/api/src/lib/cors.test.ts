import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  findInsecureHttpCorsOriginsInProduction,
  isCorsAllowlistConfigured,
  logCorsStartup,
  parseCorsAllowlistEntry,
  parseCorsAllowedOrigins,
  resetCorsRejectWarnForTests,
  resolveCorsOrigin,
} from "./cors.js";

const originalOrigins = process.env.CORS_ALLOWED_ORIGINS;
const originalPatterns = process.env.CORS_ALLOWED_ORIGIN_PATTERNS;

afterEach(() => {
  resetCorsRejectWarnForTests();
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

test("denies cross-origin when allowlist env is unset", () => {
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  assert.equal(
    resolveCorsOrigin("https://staging.cursor-sync.com"),
    null
  );
  assert.equal(resolveCorsOrigin(undefined), null);
  assert.equal(isCorsAllowlistConfigured(), false);
});

test("treats empty allowlist env as unset", () => {
  process.env.CORS_ALLOWED_ORIGINS = "   ";
  assert.equal(resolveCorsOrigin("https://staging.cursor-sync.com"), null);
  assert.equal(isCorsAllowlistConfigured(), false);
});

test("rejects wildcard entries at config parse", () => {
  const parsed = parseCorsAllowlistEntry(
    "https://*-marcelo-barellas-projects.vercel.app"
  );
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.match(parsed.reason, /wildcards/i);
  }

  const list = parseCorsAllowedOrigins(
    "https://staging.cursor-sync.com,*-evil.vercel.app"
  );
  assert.deepEqual(list.allowed, ["https://staging.cursor-sync.com"]);
  assert.equal(list.rejected.length, 1);
});

test("normalizes trailing slashes in allowlist entries", () => {
  const parsed = parseCorsAllowlistEntry("https://staging.cursor-sync.com/");
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.origin, "https://staging.cursor-sync.com");
  }
});

test("origin comparison is case- and port-exact", () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://staging.cursor-sync.com";
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  assert.equal(
    resolveCorsOrigin("https://STAGING.cursor-sync.com"),
    null
  );
  process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000";
  assert.equal(resolveCorsOrigin("http://localhost:3001"), null);
  assert.equal(resolveCorsOrigin("http://localhost:3000"), "http://localhost:3000");
});

test("findInsecureHttpCorsOriginsInProduction leaves only loopback http origins", () => {
  assert.deepEqual(
    findInsecureHttpCorsOriginsInProduction({
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS:
        "https://staging.cursor-sync.com,http://insecure.example",
    }),
    []
  );
  assert.deepEqual(
    findInsecureHttpCorsOriginsInProduction({
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "http://localhost:3000,https://ok.example",
    }),
    []
  );
  assert.deepEqual(
    findInsecureHttpCorsOriginsInProduction({
      NODE_ENV: "development",
      CORS_ALLOWED_ORIGINS: "http://insecure.example",
    }),
    []
  );
});

test("logCorsStartup rejects http non-loopback allowlist entries", () => {
  const errors: string[] = [];
  const originalError = console.error;
  const originalEnv = process.env;
  console.error = (message?: unknown) => {
    errors.push(String(message));
  };
  try {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "http://evil.example",
    };
    logCorsStartup();
    assert.ok(errors.some((line) => /rejected entry/i.test(line)));
  } finally {
    process.env = originalEnv;
    console.error = originalError;
  }
});

test("logCorsStartup errors once when allowlist unset", () => {
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (message?: unknown) => {
    errors.push(String(message));
  };
  try {
    delete process.env.CORS_ALLOWED_ORIGINS;
    logCorsStartup();
    assert.equal(errors.length, 1);
    assert.match(errors[0]!, /fail closed/i);
  } finally {
    console.error = originalError;
  }
});

test("logCorsStartup warns when origin patterns env is set", () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (message?: unknown) => {
    warnings.push(String(message));
  };
  try {
    process.env.CORS_ALLOWED_ORIGINS = "https://staging.cursor-sync.com";
    process.env.CORS_ALLOWED_ORIGIN_PATTERNS =
      "*-marcelo-barellas-projects.vercel.app";
    logCorsStartup();
    assert.ok(warnings.some((line) => /ignored/i.test(line)));
  } finally {
    console.warn = originalWarn;
  }
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

test("denies unlisted Vercel preview origins without pattern allowlist", () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://staging.cursor-sync.com";
  delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
  assert.equal(
    resolveCorsOrigin(
      "https://cursor-sync-abc123-marcelo-barellas-projects.vercel.app"
    ),
    null
  );
  assert.equal(
    resolveCorsOrigin("https://evil-marcelo-barellas-projects.vercel.app"),
    null
  );
});