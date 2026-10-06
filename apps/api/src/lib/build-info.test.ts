import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getBuildInfo } from "./build-info.js";

describe("getBuildInfo", () => {
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("reads GIT_SHA and APP_VERSION from environment", () => {
    saved.GIT_SHA = process.env.GIT_SHA;
    saved.APP_VERSION = process.env.APP_VERSION;
    process.env.GIT_SHA = "abc123def";
    process.env.APP_VERSION = "0.8.4-staging";
    assert.deepEqual(getBuildInfo(), {
      version: "0.8.4-staging",
      gitSha: "abc123def",
    });
  });
});
