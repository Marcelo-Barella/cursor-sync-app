import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIpFromForwarded, normalizeIpAddress } from "./client-ip.js";

describe("client IP resolution", () => {
  it("rejects garbage in X-Forwarded-For without throwing", () => {
    assert.equal(
      clientIpFromForwarded("not-an-ip", "203.0.113.10", 1),
      "203.0.113.10"
    );
    assert.equal(clientIpFromForwarded("not-an-ip", "also-bad", 1), null);
  });

  it("uses the client hop to the left of trusted proxies (not leftmost spoof)", () => {
    const xff = "203.0.113.1, 198.51.100.2, 192.0.2.50";
    assert.equal(clientIpFromForwarded(xff, null, 1), "198.51.100.2");
    assert.equal(clientIpFromForwarded(xff, null, 0), "192.0.2.50");
  });

  it("accepts IPv6 addresses", () => {
    assert.equal(
      clientIpFromForwarded("2001:db8::1, 2001:db8::2", null, 1),
      "2001:db8::1"
    );
    assert.equal(normalizeIpAddress("::1"), "::1");
  });

  it("falls back to the socket address when X-Forwarded-For is absent", () => {
    assert.equal(clientIpFromForwarded(null, "198.51.100.99", 1), "198.51.100.99");
    assert.equal(clientIpFromForwarded(undefined, "::ffff:10.0.0.5", 1), "10.0.0.5");
  });
});
