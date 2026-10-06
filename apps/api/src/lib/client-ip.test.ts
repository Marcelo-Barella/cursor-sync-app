import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIpFromForwarded, normalizeIpAddress } from "./client-ip.js";

describe("client IP resolution", () => {
  it("selects client IP with Express-compatible hop indexing", () => {
    assert.equal(
      clientIpFromForwarded("1.1.1.1, 2.2.2.2, 3.3.3.3", null, 1),
      "3.3.3.3"
    );
    assert.equal(
      clientIpFromForwarded("203.0.113.1, 198.51.100.2, 192.0.2.50", null, 1),
      "192.0.2.50"
    );
    assert.equal(
      clientIpFromForwarded("203.0.113.1, 198.51.100.2, 192.0.2.50", null, 2),
      "198.51.100.2"
    );
    assert.equal(
      clientIpFromForwarded("fake, 203.0.113.9", "10.0.0.1", 1),
      "203.0.113.9"
    );
    assert.equal(
      clientIpFromForwarded("203.0.113.9", "10.0.0.1", 1),
      "203.0.113.9"
    );
  });

  it("rejects garbage in X-Forwarded-For without throwing", () => {
    assert.equal(
      clientIpFromForwarded("not-an-ip", "203.0.113.10", 1),
      "203.0.113.10"
    );
    assert.equal(clientIpFromForwarded("not-an-ip", "also-bad", 1), null);
  });

  it("uses socket when hops is 0 or the chain is shorter than hops", () => {
    assert.equal(
      clientIpFromForwarded("a, b, c", "198.51.100.99", 0),
      "198.51.100.99"
    );
    assert.equal(
      clientIpFromForwarded("only-client", "198.51.100.88", 2),
      "198.51.100.88"
    );
  });

  it("accepts IPv6 addresses", () => {
    assert.equal(
      clientIpFromForwarded("2001:db8::1, 2001:db8::2", null, 1),
      "2001:db8::2"
    );
    assert.equal(normalizeIpAddress("::1"), "::1");
  });

  it("falls back to the socket address when X-Forwarded-For is absent", () => {
    assert.equal(clientIpFromForwarded(null, "198.51.100.99", 1), "198.51.100.99");
    assert.equal(clientIpFromForwarded(undefined, "::ffff:10.0.0.5", 1), "10.0.0.5");
  });
});
