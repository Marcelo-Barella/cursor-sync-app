import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./apiBase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apiBase")>();
  return {
    ...actual,
    getApiBaseUrlForAuth: () => "https://api.example.com",
    isAuthApiBaseMissing: () => false,
  };
});

import { API_BASE_STORAGE_KEY } from "./apiBase";
import {
  HANDOFF_ATTEMPTED_KEY,
  OAUTH_REDIRECT_URI_KEY,
  OAUTH_STATE_KEY,
  TOKEN_STORAGE_KEY,
} from "./auth";
import { E2E_IDB_NAME, rememberUnlockedKey } from "./e2eKeyCache";
import { PENDING_LOGIN_CODE_KEY } from "./loginHandoff";
import {
  AUTH_SESSION_STORAGE_KEYS,
  clearClientAuthState,
  isPreservedPreferenceKey,
  logout,
} from "./logout";
import { THEME_STORAGE_KEY } from "./theme";

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

describe("logout", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createMemoryStorage());
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("indexedDB", {
      deleteDatabase: () => {
        const request = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          onblocked: null as (() => void) | null,
        };
        queueMicrotask(() => request.onsuccess?.());
        return request;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("removes auth session storage keys and API override but keeps theme", () => {
    const session = sessionStorage as Storage;
    const local = localStorage as Storage;

    for (const key of AUTH_SESSION_STORAGE_KEYS) {
      session.setItem(key, "value");
    }
    local.setItem(API_BASE_STORAGE_KEY, "https://override.example.com");
    local.setItem(THEME_STORAGE_KEY, "dark");

    clearClientAuthState({ session, local });

    for (const key of AUTH_SESSION_STORAGE_KEYS) {
      expect(session.getItem(key)).toBeNull();
    }
    expect(local.getItem(API_BASE_STORAGE_KEY)).toBeNull();
    expect(local.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(isPreservedPreferenceKey(THEME_STORAGE_KEY)).toBe(true);
  });

  it("redirects to sign-in with history replace when requested", async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
    const navigate = vi.fn();

    await logout({ redirectToLogin: true, navigate });

    expect(navigate).toHaveBeenCalledWith("/sign-in", { replace: true });
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("still clears local auth when server logout fails", async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
    vi.mocked(fetch).mockRejectedValue(new Error("network"));

    await logout({ redirectToLogin: false });

    expect(fetch).toHaveBeenCalled();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("clears in-memory E2E key cache", () => {
    rememberUnlockedKey("abcd", new ArrayBuffer(8));
    clearClientAuthState();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("tracks the expected session storage keys", () => {
    expect(AUTH_SESSION_STORAGE_KEYS).toEqual(
      expect.arrayContaining([
        TOKEN_STORAGE_KEY,
        OAUTH_REDIRECT_URI_KEY,
        OAUTH_STATE_KEY,
        HANDOFF_ATTEMPTED_KEY,
        PENDING_LOGIN_CODE_KEY,
      ])
    );
    expect(E2E_IDB_NAME).toBe("cursor-sync-e2e");
  });
});
