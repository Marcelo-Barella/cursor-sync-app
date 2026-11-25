import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API_BASE_STORAGE_KEY,
  defaultApiBaseForMode,
  normalizeApiBaseUrl,
  parseStrictProductionApiOrigin,
  resolveApiBaseUrl,
  resolveBuildTimeOnlyApiBaseUrl,
  setStoredApiOverride,
  isAllowedDevApiOrigin,
} from "./apiBase";
import { DEFAULT_LOCAL_API_BASE_URL } from "./defaults";
import {
  bootstrapApiBaseFromLocation,
  purgeStoredApiOverrides,
  stripApiQueryParamFromLocation,
} from "./apiBaseSecurity";
import { readQueryApiOverride } from "./apiBase.dev";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("normalizeApiBaseUrl", () => {
  it("returns origin-only values and trims trailing slashes", () => {
    expect(normalizeApiBaseUrl("https://api.example.com/")).toBe(
      "https://api.example.com"
    );
    expect(normalizeApiBaseUrl("http://localhost:8100///")).toBe(
      "http://localhost:8100"
    );
  });

  it("rejects paths, credentials, and invalid protocols", () => {
    expect(normalizeApiBaseUrl("https://api.example.com/v1")).toBeNull();
    expect(normalizeApiBaseUrl("https://user:pass@api.example.com")).toBeNull();
    expect(normalizeApiBaseUrl("ftp://example.com")).toBeNull();
    expect(normalizeApiBaseUrl("not-a-url")).toBeNull();
    expect(normalizeApiBaseUrl("")).toBeNull();
  });
});

describe("parseStrictProductionApiOrigin", () => {
  it("accepts https origins without paths", () => {
    expect(parseStrictProductionApiOrigin("https://api-staging.cursor-sync.com/")).toBe(
      "https://api-staging.cursor-sync.com"
    );
  });

  it("rejects http, paths, and credentials in production-like validation", () => {
    expect(parseStrictProductionApiOrigin("http://localhost:8100")).toBeNull();
    expect(parseStrictProductionApiOrigin("https://api.example.com/api")).toBeNull();
    expect(
      parseStrictProductionApiOrigin("https://user:pass@api.example.com")
    ).toBeNull();
  });
});

describe("resolveApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not invent a production API host when build-time URL is missing", () => {
    vi.stubEnv("DEV", false);
    const storage = createMemoryStorage();
    const url = resolveApiBaseUrl({
      storage,
      buildTimeUrl: "",
      mode: "production",
    });
    expect(url).toBe("");
    expect(normalizeApiBaseUrl(url)).toBeNull();
  });

  it("uses build-time https URL in production bundles and ignores storage", () => {
    vi.stubEnv("DEV", false);
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://attacker.example");
    expect(
      resolveApiBaseUrl({
        storage,
        buildTimeUrl: "https://api-staging.cursor-sync.com",
        mode: "staging",
      })
    ).toBe("https://api-staging.cursor-sync.com");
  });

  it("ignores ?api= in production bundles", () => {
    vi.stubEnv("DEV", false);
    const storage = createMemoryStorage();
    expect(
      resolveApiBaseUrl({
        storage,
        buildTimeUrl: "https://api.example.com",
        mode: "production",
      })
    ).toBe("https://api.example.com");
    expect(readQueryApiOverride("?api=https://attacker.example")).toBeNull();
  });

  it("uses localhost only in development when nothing else is set", () => {
    expect(defaultApiBaseForMode("development")).toBe(DEFAULT_LOCAL_API_BASE_URL);
    expect(defaultApiBaseForMode("production")).toBe("");
    expect(defaultApiBaseForMode("staging")).toBe("");
  });

  it("allows dev storage override for localhost", () => {
    vi.stubEnv("DEV", true);
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "http://localhost:9999");
    expect(
      resolveApiBaseUrl({
        storage,
        buildTimeUrl: "http://localhost:8100",
        mode: "development",
      })
    ).toBe("http://localhost:9999");
  });

  it("resolveBuildTimeOnlyApiBaseUrl ignores localStorage and query overrides", () => {
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://stored.example.com");
    expect(
      resolveBuildTimeOnlyApiBaseUrl({
        buildTimeUrl: "https://build.example.com",
        mode: "staging",
      })
    ).toBe("https://build.example.com");
  });

  it("rejects dev storage override for non-allowlisted hosts", () => {
    vi.stubEnv("DEV", true);
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://stored.example.com");
    expect(
      resolveApiBaseUrl({
        storage,
        buildTimeUrl: "http://localhost:8100",
        mode: "development",
      })
    ).toBe("http://localhost:8100");
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBeNull();
  });

  it("setStoredApiOverride clears invalid stored values on write", () => {
    vi.stubEnv("DEV", true);
    const storage = createMemoryStorage();
    setStoredApiOverride("http://localhost:4444/", storage);
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBe("http://localhost:4444");
    setStoredApiOverride(null, storage);
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBeNull();
  });
});

describe("readQueryApiOverride", () => {
  it("treats empty api param as clear", () => {
    expect(readQueryApiOverride("?api=")).toEqual({ action: "clear" });
  });

  it("rejects attacker hosts", () => {
    expect(readQueryApiOverride("?api=https://attacker.example")).toBeNull();
  });

  it("accepts localhost overrides", () => {
    expect(readQueryApiOverride("?api=http://127.0.0.1:7777")).toEqual({
      action: "set",
      url: "http://127.0.0.1:7777",
    });
  });
});

describe("isAllowedDevApiOrigin", () => {
  it("allows localhost and denies arbitrary https hosts without allowlist", () => {
    expect(isAllowedDevApiOrigin("http://localhost:8100")).toBe(true);
    expect(isAllowedDevApiOrigin("https://attacker.example")).toBe(false);
  });
});

describe("apiBaseSecurity bootstrap", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("purges stored API override keys", () => {
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://attacker.example");
    purgeStoredApiOverrides(storage);
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBeNull();
  });

  it("strips api from the URL", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        href: "https://cursor-sync.com/auth/continue?api=https://evil.example&state=1",
        pathname: "/auth/continue",
        hash: "",
      },
      history: { replaceState },
    } as unknown as Window);
    stripApiQueryParamFromLocation();
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/auth/continue?state=1"
    );
  });

  it("in dev, applies localhost ?api= after purge", async () => {
    vi.stubEnv("DEV", true);
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://attacker.example");
    const replaceState = vi.fn();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      location: {
        href: "http://localhost:3000/?api=http://localhost:7777",
        search: "?api=http://localhost:7777",
        pathname: "/",
        hash: "",
      },
      history: { replaceState },
      dispatchEvent: vi.fn(),
    } as unknown as Window);
    await bootstrapApiBaseFromLocation();
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBe("http://localhost:7777");
    expect(replaceState).toHaveBeenCalled();
  });
});