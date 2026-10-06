import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLegacyPlaintextPayloadWrite,
  legacyObjectKeysFromPayload,
} from "./legacy-config-payload.js";

describe("legacy config payload", () => {
  it("extracts path keys from legacy payload shape", () => {
    assert.deepEqual(
      legacyObjectKeysFromPayload({ paths: { "settings.json": {}, "chats/a.json": {} } }),
      ["settings.json", "chats/a.json"]
    );
  });

  it("detects non-empty legacy payload writes", () => {
    assert.equal(isLegacyPlaintextPayloadWrite(undefined), false);
    assert.equal(isLegacyPlaintextPayloadWrite({}), false);
    assert.equal(isLegacyPlaintextPayloadWrite({ paths: {} }), true);
  });
});
