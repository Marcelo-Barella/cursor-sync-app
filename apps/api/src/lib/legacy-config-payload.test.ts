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
      ["chats/a.json", "settings.json"]
    );
  });

  it("extracts file keys from 0.8.4-style payload (files, not paths)", () => {
    const payload = {
      schemaVersion: 1,
      profile: "default",
      files: {
        "cursor-user/settings.json": { size: 120 },
        "cursor-user/keybindings.json": { size: 40 },
        "cursor-user/snippets/ts.json": { size: 88 },
        "dot-cursor/rules/test.mdc": { size: 200 },
        "dot-cursor/skills/coding/SKILL.md": { size: 4096 },
      },
    };
    assert.deepEqual(legacyObjectKeysFromPayload(payload), [
      "cursor-user/keybindings.json",
      "cursor-user/settings.json",
      "cursor-user/snippets/ts.json",
      "dot-cursor/rules/test.mdc",
      "dot-cursor/skills/coding/SKILL.md",
    ]);
    assert.deepEqual(
      legacyObjectKeysFromPayload({
        files: payload.files,
        paths: { "ignored-because-files-wins.json": {} },
      }),
      legacyObjectKeysFromPayload(payload)
    );
  });

  it("detects non-empty legacy payload writes", () => {
    assert.equal(isLegacyPlaintextPayloadWrite(undefined), false);
    assert.equal(isLegacyPlaintextPayloadWrite({}), false);
    assert.equal(isLegacyPlaintextPayloadWrite({ paths: {} }), true);
  });
});
