import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  parseApiOriginForCsp,
} from "./csp";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

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

describe("generated vercel headers", () => {
  it("matches connect-src when generated artifact exists", () => {
    const generatedPath = path.join(webRoot, "../../.generated-security-headers.json");
    if (!existsSync(generatedPath)) {
      return;
    }
    const generated = JSON.parse(readFileSync(generatedPath, "utf8")) as {
      apiOrigin: string;
      csp: string;
    };
    const vercel = JSON.parse(
      readFileSync(path.join(webRoot, "../../vercel.json"), "utf8")
    ) as {
      headers: Array<{ headers: Array<{ key: string; value: string }> }>;
    };
    const cspHeader = vercel.headers[0].headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    expect(cspHeader?.value).toBe(generated.csp);
    expect(cspHeader?.value).toContain(`connect-src 'self' ${generated.apiOrigin}`);
  });
});