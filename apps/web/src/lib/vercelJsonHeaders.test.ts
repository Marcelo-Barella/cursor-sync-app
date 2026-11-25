import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  API_ORIGIN_PRODUCTION,
  API_ORIGIN_STAGING,
  STRICT_TRANSPORT_SECURITY,
  VERCEL_HOSTS_PRODUCTION,
  VERCEL_HOST_STAGING,
  buildContentSecurityPolicy,
  buildVercelSecurityHeaderPairs,
  parseConnectSrcOrigins,
} from "./csp";

type VercelHeadersFile = {
  headers: Array<{
    source: string;
    has?: Array<{ type: string; value: string }>;
    headers: Array<{ key: string; value: string }>;
  }>;
};

const vercelJson = JSON.parse(
  readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../../vercel.json"),
    "utf8"
  )
) as VercelHeadersFile;

const ALLOWED_CONNECT_ORIGINS = new Set([
  API_ORIGIN_PRODUCTION,
  API_ORIGIN_STAGING,
]);

function cspFromRule(
  rule: VercelHeadersFile["headers"][number]
): string | undefined {
  return rule.headers.find((h) => h.key === "Content-Security-Policy")?.value;
}

function hostFromRule(
  rule: VercelHeadersFile["headers"][number]
): string | null {
  const host = rule.has?.find((entry) => entry.type === "host");
  return host?.value ?? null;
}

describe("vercel.json static security headers", () => {
  it("lists fallback first, then staging, then production hosts (later rules override)", () => {
    expect(vercelJson.headers).toHaveLength(4);
    expect(vercelJson.headers[0].has).toBeUndefined();
    expect(hostFromRule(vercelJson.headers[1])).toBe(VERCEL_HOST_STAGING);
    expect(hostFromRule(vercelJson.headers[2])).toBe(VERCEL_HOSTS_PRODUCTION[0]);
    expect(hostFromRule(vercelJson.headers[3])).toBe(VERCEL_HOSTS_PRODUCTION[1]);
  });

  it("assigns connect-src per host", () => {
    const fallback = parseConnectSrcOrigins(cspFromRule(vercelJson.headers[0])!);
    expect(fallback).toEqual([API_ORIGIN_STAGING]);

    const staging = parseConnectSrcOrigins(cspFromRule(vercelJson.headers[1])!);
    expect(staging).toEqual([API_ORIGIN_STAGING]);

    const prod = parseConnectSrcOrigins(cspFromRule(vercelJson.headers[2])!);
    const prodWww = parseConnectSrcOrigins(cspFromRule(vercelJson.headers[3])!);
    expect(prod).toEqual([API_ORIGIN_PRODUCTION]);
    expect(prodWww).toEqual([API_ORIGIN_PRODUCTION]);
  });

  it("includes frame-ancestors on every CSP and denies framing", () => {
    for (const rule of vercelJson.headers) {
      const csp = cspFromRule(rule)!;
      expect(csp).toContain("frame-ancestors 'none'");
      const xfo = rule.headers.find((h) => h.key === "X-Frame-Options")?.value;
      expect(xfo).toBe("DENY");
    }
  });

  it("sets HSTS, nosniff, referrer, and permissions on every rule", () => {
    const expected = buildVercelSecurityHeaderPairs(
      buildContentSecurityPolicy(API_ORIGIN_STAGING)
    ).map((h) => ({ key: h.key, value: h.value }));

    for (const rule of vercelJson.headers) {
      for (const header of expected) {
        if (header.key === "Content-Security-Policy") {
          continue;
        }
        const actual = rule.headers.find((h) => h.key === header.key);
        expect(actual?.value).toBe(header.value);
      }
      const hsts = rule.headers.find(
        (h) => h.key === "Strict-Transport-Security"
      )?.value;
      expect(hsts).toBe(STRICT_TRANSPORT_SECURITY);
    }
  });

  it("does not allow arbitrary connect-src origins", () => {
    for (const rule of vercelJson.headers) {
      const origins = parseConnectSrcOrigins(cspFromRule(rule)!);
      for (const origin of origins) {
        expect(ALLOWED_CONNECT_ORIGINS.has(origin)).toBe(true);
      }
      expect(origins.some((o) => o.includes("*"))).toBe(false);
    }
  });
});