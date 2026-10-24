import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mintTempCredentials, type R2Config } from "./r2.js";

const baseConfig: R2Config = {
  accountId: "test-account-id",
  bucket: "cursor-sync-lab",
  parentAccessKeyId: "parent-access-key-id",
  parentSecretAccessKey: "parent-secret-access-key",
  apiToken: "cf-api-token",
};

let originalFetch: typeof fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("mintTempCredentials includes parentAccessKeyId in Cloudflare request body", async () => {
  let requestBody: Record<string, unknown> | undefined;

  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        success: true,
        result: {
          accessKeyId: "temp-key",
          secretAccessKey: "temp-secret",
          sessionToken: "session-token",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  await mintTempCredentials(baseConfig, "user-abc", 900);

  assert.equal(requestBody?.parentAccessKeyId, "parent-access-key-id");
  assert.equal(requestBody?.bucket, "cursor-sync-lab");
  assert.deepEqual(requestBody?.prefixes, ["users/user-abc/"]);
});
