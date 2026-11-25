import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const envExamplePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../.env.example"
);

test(".env.example documents local CORS allowlist for compose", () => {
  const envExample = readFileSync(envExamplePath, "utf8");
  assert.match(
    envExample,
    /^CORS_ALLOWED_ORIGINS=http:\/\/localhost:3000$/m
  );
});