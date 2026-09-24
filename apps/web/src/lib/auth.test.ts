import { describe, expect, it } from "vitest";
import {
  buildExtensionAuthRedirectUrl,
  EXTENSION_AUTH_URI,
  HANDOFF_ATTEMPTED_KEY,
  isAllowedExtensionRedirectUri,
} from "./auth";

describe("isAllowedExtensionRedirectUri", () => {
  it("accepts cursor and vscode schemes for the extension auth path", () => {
    expect(isAllowedExtensionRedirectUri(EXTENSION_AUTH_URI)).toBe(true);
    expect(
      isAllowedExtensionRedirectUri("vscode://MarceloBarella.cursor-sync/auth")
    ).toBe(true);
    expect(
      isAllowedExtensionRedirectUri("cursor://marcelobarella.cursor-sync/auth")
    ).toBe(true);
  });

  it("rejects other schemes, hosts, and paths", () => {
    expect(isAllowedExtensionRedirectUri("https://evil.example/auth")).toBe(false);
    expect(isAllowedExtensionRedirectUri("cursor://other.cursor-sync/auth")).toBe(
      false
    );
    expect(isAllowedExtensionRedirectUri("cursor://MarceloBarella.cursor-sync/other")).toBe(
      false
    );
  });
});

describe("buildExtensionAuthRedirectUrl", () => {
  it("appends encoded code and state query params", () => {
    const url = buildExtensionAuthRedirectUrl(
      EXTENSION_AUTH_URI,
      "code+special/value",
      "state with spaces"
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("code")).toBe("code+special/value");
    expect(parsed.searchParams.get("state")).toBe("state with spaces");
    expect(parsed.searchParams.has("token")).toBe(false);
  });

  it("passes state through unchanged", () => {
    const url = buildExtensionAuthRedirectUrl(EXTENSION_AUTH_URI, "abc123", "opaque-state");
    expect(url).toContain("state=opaque-state");
    expect(url).toContain("code=abc123");
  });

  it("never puts a session token in the redirect URL", () => {
    expect(() =>
      buildExtensionAuthRedirectUrl(
        `${EXTENSION_AUTH_URI}?token=leak`,
        "abc",
        null
      )
    ).toThrow(/token/);
  });

  it("rejects disallowed redirect URIs", () => {
    expect(() =>
      buildExtensionAuthRedirectUrl("https://evil.example/auth", "abc", null)
    ).toThrow(/Invalid redirect URI/);
  });
});

describe("handoff keys", () => {
  it("defines a session storage key for handoff tracking", () => {
    expect(HANDOFF_ATTEMPTED_KEY).toBe("cursor_sync_handoff_attempted");
  });
});
