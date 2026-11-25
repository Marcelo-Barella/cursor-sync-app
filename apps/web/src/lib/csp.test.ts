import { describe, expect, it } from "vitest";
import {
  API_ORIGIN_PRODUCTION,
  API_ORIGIN_STAGING,
  buildContentSecurityPolicy,
  buildMetaContentSecurityPolicyValue,
  parseApiOriginForCsp,
} from "./csp";

describe("parseApiOriginForCsp", () => {
  it("requires https for remote APIs", () => {
    expect(parseApiOriginForCsp("https://api-staging.cursor-sync.com/")).toBe(
      "https://api-staging.cursor-sync.com"
    );
    expect(parseApiOriginForCsp("http://api.example.com")).toBeNull();
  });

  it("allows local http for docker", () => {
    expect(parseApiOriginForCsp("http://localhost:8100/")).toBe(
      "http://localhost:8100"
    );
  });
});

describe("buildContentSecurityPolicy", () => {
  it("includes exactly the API origin in connect-src", () => {
    const origin = "https://api-staging.cursor-sync.com";
    const csp = buildContentSecurityPolicy(origin);
    expect(csp).toContain(`connect-src 'self' ${origin}`);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("buildMetaContentSecurityPolicyValue", () => {
  it("omits frame-ancestors and allows both API origins for policy intersection", () => {
    const meta = buildMetaContentSecurityPolicyValue();
    expect(meta).not.toContain("frame-ancestors");
    expect(meta).toContain(`connect-src 'self' ${API_ORIGIN_PRODUCTION}`);
    expect(meta).toContain(API_ORIGIN_STAGING);
  });
});