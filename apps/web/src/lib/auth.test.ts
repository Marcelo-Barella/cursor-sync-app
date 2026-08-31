import { describe, expect, it } from "vitest";
import {
  buildExtensionAuthUrl,
  EXTENSION_AUTH_URI,
  HANDOFF_ATTEMPTED_KEY,
} from "./auth";

describe("buildExtensionAuthUrl", () => {
  it("builds the cursor extension auth deep link with token", () => {
    const url = buildExtensionAuthUrl("jwt-token-123");
    expect(url).toBe(`${EXTENSION_AUTH_URI}?token=jwt-token-123`);
  });
});

describe("handoff keys", () => {
  it("defines a session storage key for handoff tracking", () => {
    expect(HANDOFF_ATTEMPTED_KEY).toBe("cursor_sync_handoff_attempted");
  });
});
