import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAuthCallbackRedirect, normalizeRedirectUri } from "./redirect-uri.js";

describe("normalizeRedirectUri", () => {
  it("accepts cursor and vscode extension auth URIs (case-insensitive authority)", () => {
    assert.equal(
      normalizeRedirectUri("cursor://MarceloBarella.cursor-sync/auth"),
      "cursor://marcelobarella.cursor-sync/auth"
    );
    assert.equal(
      normalizeRedirectUri("vscode://marcelobarella.cursor-sync/auth"),
      "vscode://marcelobarella.cursor-sync/auth"
    );
    assert.equal(
      normalizeRedirectUri("cursor://MarceloBarella.cursor-sync/auth/"),
      "cursor://marcelobarella.cursor-sync/auth"
    );
  });

  it("rejects invalid redirect URIs with 400-worthy inputs", () => {
    assert.equal(normalizeRedirectUri("https://MarceloBarella.cursor-sync/auth"), null);
    assert.equal(normalizeRedirectUri("cursor://evil.cursor-sync/auth"), null);
    assert.equal(normalizeRedirectUri("cursor://MarceloBarella.cursor-sync/other"), null);
    assert.equal(normalizeRedirectUri(""), null);
  });
});

describe("buildAuthCallbackRedirect", () => {
  it("encodes code and preserves state", () => {
    const uri = buildAuthCallbackRedirect(
      "cursor://MarceloBarella.cursor-sync/auth",
      "a+b/c",
      "opaque"
    );
    assert.match(uri, /code=a%2Bb%2Fc/);
    assert.match(uri, /state=opaque/);
  });
});
