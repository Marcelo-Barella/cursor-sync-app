import { describe, expect, it } from "vitest";
import {
  API_BASE_STORAGE_KEY,
  STAGING_API_BASE_URL,
  normalizeApiBaseUrl,
  readQueryApiOverride,
  resolveApiBaseUrl,
  setStoredApiOverride,
} from "./apiBase";

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
      search: "",
      buildTimeUrl: "",
      mode: "production",
    });
    expect(url).toBe("");
    expect(normalizeApiBaseUrl(url)).toBeNull();
  });

  it("uses the staging default when nothing else is set in staging mode", () => {
    const storage = createMemoryStorage();
    expect(
      resolveApiBaseUrl({ storage, search: "", buildTimeUrl: "", mode: "staging" })
    ).toBe(STAGING_API_BASE_URL);
  });

  it("never returns an empty string as a usable auth API base in production-like modes", () => {
    const storage = createMemoryStorage();
    for (const mode of ["production", "staging"] as const) {
      const url = resolveApiBaseUrl({
        storage,
        search: "",
        buildTimeUrl: mode === "production" ? "" : "https://api-staging.example.com",
        mode,
      });
      const authBase = normalizeApiBaseUrl(url);
      if (mode === "production" && !url) {
        expect(authBase).toBeNull();
      } else {
        expect(authBase).not.toBeNull();
      }
    }
  });

  it("uses VITE_API_URL when provided at build time", () => {
    const storage = createMemoryStorage();
    expect(
      resolveApiBaseUrl({
        storage,
        search: "",
        buildTimeUrl: "http://localhost:8100/",
      })
    ).toBe("http://localhost:8100");
  });

  it("prefers localStorage override over build-time URL", () => {
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://stored.example.com");
    expect(
      resolveApiBaseUrl({
        storage,
        search: "",
        buildTimeUrl: "http://localhost:8100",
      })
    ).toBe("https://stored.example.com");
  });

  it("saves a valid ?api= override to storage and uses it", () => {
    const storage = createMemoryStorage();
    expect(
      resolveApiBaseUrl({
        storage,
        search: "?api=http://localhost:9999/",
        buildTimeUrl: "http://localhost:8100",
      })
    ).toBe("http://localhost:9999");
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBe("http://localhost:9999");
  });

  it("prefers ?api= over stored override for the current resolution", () => {
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://stored.example.com");
    expect(
      resolveApiBaseUrl({
        storage,
        search: "?api=http://localhost:7777",
      })
    ).toBe("http://localhost:7777");
  });

  it("clears storage when ?api=clear is present and falls back", () => {
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://stored.example.com");
    expect(
      resolveApiBaseUrl({
        storage,
        search: "?api=clear",
        buildTimeUrl: "http://localhost:8100",
        mode: "development",
      })
    ).toBe("http://localhost:8100");
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBeNull();
  });

  it("ignores invalid ?api= values and keeps lower-precedence sources", () => {
    const storage = createMemoryStorage();
    storage.setItem(API_BASE_STORAGE_KEY, "https://stored.example.com");
    expect(
      resolveApiBaseUrl({
        storage,
        search: "?api=not-valid",
        buildTimeUrl: "http://localhost:8100",
      })
    ).toBe("https://stored.example.com");
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBe("https://stored.example.com");
  });

  it("setStoredApiOverride clears invalid stored values on write", () => {
    const storage = createMemoryStorage();
    setStoredApiOverride("https://override.example.com/", storage);
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBe(
      "https://override.example.com"
    );
    setStoredApiOverride(null, storage);
    expect(storage.getItem(API_BASE_STORAGE_KEY)).toBeNull();
  });
});

describe("readQueryApiOverride", () => {
  it("treats empty api param as clear", () => {
    expect(readQueryApiOverride("?api=")).toEqual({ action: "clear" });
  });
});
