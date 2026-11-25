import { describe, expect, it, vi } from "vitest";
import {
  API_BASE_STORAGE_KEY,
  defaultApiBaseForMode,
  normalizeApiBaseUrl,
  resolveApiBaseUrl,
} from "./apiBase";
import { DEFAULT_LOCAL_API_BASE_URL } from "./defaults";
import {
  bootstrapApiBaseFromLocation,
  purgeStoredApiOverrides,
  stripApiQueryParamFromLocation,
} from "./apiBaseSecurity";

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
  it("accepts http and https and trims trailing slashes", () => {
    expect(normalizeApiBaseUrl("https://api.example.com/")).toBe(
      "https://api.example.com"
    );
    expect(normalizeApiBaseUrl("http://localhost:8100///")).toBe(
      "http://localhost:8100"
    );
    expect(normalizeApiBaseUrl("  https://api.example.com/path/  ")).toBe(
      "https://api.example.com/path"
    );
  });

  it("rejects invalid protocols and malformed values", () => {
    expect(normalizeApiBaseUrl("ftp://example.com")).toBeNull();
    expect(normalizeApiBaseUrl("not-a-url")).toBeNull();
    expect(normalizeApiBaseUrl("")).toBeNull();
  });
});

describe("resolveApiBaseUrl", () => {
  it("does not invent a production API host when build-time URL is missing", () => {
    const storage = createMemoryStorage();
    const url = resolveApiBaseUrl({
      storage,
      buildTimeUrl: "",
      mode: "production",
    });
    expect(url).toBe("");
    expect(normalizeApiBaseUrl(url)).toBeNull();
  });

  it("does not invent a staging API host when build-time URL is missing", () => {
    const storage = createMemoryStorage();
    const url = resolveApiBaseUrl({
      storage,
      buildTimeUrl: "",
      mode: "staging",
    });
    expect(url).toBe("");
    expect(normalizeApiBaseUrl(url)).toBeNull();
  });

  it("uses localhost only in development when nothing else is set", () => {
    expect(defaultApiBaseForMode("development")).toBe(DEFAULT_LOCAL_API_BASE_URL);
    expect(defaultApiBaseForMode("production")).toBe("");
    expect(defaultApiBaseForMode("staging")).toBe("");
  });

  it("never returns an empty string as a usable auth API base in production-like modes", () => {
    const storage = createMemoryStorage();
    for (const mode of ["production", "staging"] as const) {
      const url = resolveApiBaseUrl({
        storage,
        buildTimeUrl: "",
        mode,
      });
      expect(normalizeApiBaseUrl(url)).toBeNull();
    }
  });

  it("uses VITE_API_URL when provided at build time", () => {
    const storage = createMemoryStorage();
    expect(
      resolveApiBaseUrl({
        storage,
        buildTimeUrl: "http://localhost:8100/",
      })
    ).toBe("http://localhost:8100");
  });

  it("ignores stored poisoned override and uses build-time URL", () => {
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://attacker.example");
    expect(
      resolveApiBaseUrl({
        storage,
        buildTimeUrl: "https://api.sync.example.com",
        mode: "production",
      })
    ).toBe("https://api.sync.example.com");
  });
});

describe("apiBaseSecurity bootstrap", () => {
  it("purges stored API override keys", () => {
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://attacker.example");
    purgeStoredApiOverrides(storage);
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBeNull();
  });

  it("strips api from the URL and keeps other params and the hash", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        pathname: "/auth/continue",
        search: "?api=https://evil.example&state=1",
        hash: "#panel",
      },
      history: { replaceState },
    } as unknown as Window);
    stripApiQueryParamFromLocation();
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/auth/continue?state=1#panel"
    );
    vi.unstubAllGlobals();
  });

  it("on startup ignores ?api= after purging poisoned storage", () => {
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://attacker.example");
    const replaceState = vi.fn();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      location: {
        pathname: "/sign-in",
        search: "?api=https://evil.example&redirect_uri=x",
        hash: "",
      },
      history: { replaceState },
    } as unknown as Window);
    bootstrapApiBaseFromLocation();
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBeNull();
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/sign-in?redirect_uri=x"
    );
    expect(
      resolveApiBaseUrl({
        storage,
        buildTimeUrl: "https://api.production.example",
        mode: "production",
      })
    ).toBe("https://api.production.example");
    vi.unstubAllGlobals();
  });
});