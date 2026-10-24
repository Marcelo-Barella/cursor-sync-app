import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { relativePlaintextKeysFromObjectList } from "./r2.js";

describe("relativePlaintextKeysFromObjectList", () => {
  const prefix = "users/user-1/";

  it("lists path-style objects including strays not in any manifest", () => {
    const cse1Key = "a".repeat(64);
    const keys = relativePlaintextKeysFromObjectList(prefix, [
      { Key: `${prefix}cursor-user/settings.json` },
      { Key: `${prefix}stray-old-client-only.json` },
      { Key: `${prefix}${cse1Key}` },
      { Key: `${prefix}../escape` },
    ]);
    assert.deepEqual(keys, [
      "cursor-user/settings.json",
      "stray-old-client-only.json",
    ]);
  });
});
