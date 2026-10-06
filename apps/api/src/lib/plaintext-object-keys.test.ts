import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterPlaintextObjectKeys,
  isCse1ObjectStorageKey,
  isRelativePlaintextObjectKey,
} from "./plaintext-object-keys.js";

describe("plaintext object keys", () => {
  it("allows legacy path-style keys", () => {
    assert.equal(isRelativePlaintextObjectKey("settings.json"), true);
    assert.equal(isRelativePlaintextObjectKey("chats/abc.json"), true);
  });

  it("rejects hmac hex object keys", () => {
    const hmacKey = "a".repeat(64);
    assert.equal(isCse1ObjectStorageKey(hmacKey), true);
    assert.equal(isRelativePlaintextObjectKey(hmacKey), false);
  });

  it("filters valid key lists", () => {
    assert.deepEqual(filterPlaintextObjectKeys(["a.json", "a.json"]), ["a.json"]);
    assert.equal(filterPlaintextObjectKeys(["../evil"]), null);
  });
});
