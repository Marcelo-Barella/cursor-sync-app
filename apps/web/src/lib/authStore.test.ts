import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOKEN_STORAGE_KEY } from "./auth";
import { AUTH_LOGOUT_BROADCAST_KEY, logout } from "./logout";
import { AUTH_STATE_CHANGED_EVENT } from "./sessionAuth";
import {
  bootstrapAuthFromStoredToken,
  syncReactAuthFromStorage,
} from "./authStore";

vi.mock("./apiBase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apiBase")>();
  return {
    ...actual,
    getApiBaseUrlForAuth: () => "https://api.example.com",
    getBuildTimeOnlyApiBaseUrlForAuth: () => "https://build.example.com",
    isAuthApiBaseMissing: () => false,
  };
});

function stubWindow(): void {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  vi.stubGlobal("window", {
    addEventListener(type: string, handler: (event: Event) => void) {
      const set = listeners.get(type) ?? new Set();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener(type: string, handler: (event: Event) => void) {
      listeners.get(type)?.delete(handler);
    },
    dispatchEvent(event: Event) {
      for (const handler of listeners.get(event.type) ?? []) {
        handler(event);
      }
      return true;
    },
  });
}

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

function trackAuthStateDispatches(onEach: () => void): () => number {
  let count = 0;
  const handler = () => {
    count += 1;
    onEach();
  };
  window.addEventListener(AUTH_STATE_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handler);
    return count;
  };
}

describe("auth store session sync", () => {
  beforeEach(() => {
    stubWindow();
    vi.stubGlobal("sessionStorage", createMemoryStorage());
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204 }));
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

  it("logout triggers a bounded number of auth state dispatches", async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
    let depth = 0;
    const finish = trackAuthStateDispatches(() => {
      depth += 1;
      if (depth > 32) {
        throw new Error("stack overflow");
      }
      const setToken = vi.fn();
      syncReactAuthFromStorage({
        setToken,
        setEmail: vi.fn(),
        setLoading: vi.fn(),
      });
    });

    await logout({ redirectToLogin: false });

    expect(finish()).toBeLessThanOrEqual(1);
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_LOGOUT_BROADCAST_KEY)).not.toBeNull();
  });

  it("failed getMe bootstrap clears session without recursive dispatches", async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
    let depth = 0;
    const finish = trackAuthStateDispatches(() => {
      depth += 1;
      if (depth > 32) {
        throw new Error("stack overflow");
      }
      syncReactAuthFromStorage({
        setToken: vi.fn(),
        setEmail: vi.fn(),
        setLoading: vi.fn(),
      });
    });

    const cleared = vi.fn();
    const result = await bootstrapAuthFromStoredToken({
      token: readTokenFromSession(),
      loadProfile: async () => {
        throw new Error("401");
      },
      onAuthenticated: vi.fn(),
      onSessionInvalid: async () => {
        await logout({ redirectToLogin: false });
        cleared();
      },
    });

    expect(result).toBe("cleared");
    expect(cleared).toHaveBeenCalled();
    expect(finish()).toBeLessThanOrEqual(1);
  });

  it("no token at startup performs zero auth state dispatches", () => {
    const finish = trackAuthStateDispatches(() => {
      throw new Error("unexpected auth state dispatch");
    });

    const tokenUpdates: Array<string | null> = [];
    syncReactAuthFromStorage({
      setToken: (value) => tokenUpdates.push(value),
      setEmail: vi.fn(),
      setLoading: vi.fn(),
    });

    expect(tokenUpdates).toEqual([null]);
    expect(finish()).toBe(0);
  });

  it("returns no_token when bootstrap runs without a stored token", async () => {
    const finish = trackAuthStateDispatches(() => {
      throw new Error("unexpected auth state dispatch");
    });

    const result = await bootstrapAuthFromStoredToken({
      token: null,
      loadProfile: async () => ({ email: "skip@example.com" }),
      onAuthenticated: vi.fn(),
      onSessionInvalid: vi.fn(),
    });

    expect(result).toBe("no_token");
    expect(finish()).toBe(0);
  });
});

function readTokenFromSession(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}