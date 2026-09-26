import {
  DEFAULT_LOCAL_API_BASE_URL,
  DEFAULT_PRODUCTION_API_BASE_URL,
  DEFAULT_STAGING_API_BASE_URL,
} from "./defaults";
import { messageForAuthErrorCategory } from "./authErrors";

export const API_BASE_STORAGE_KEY = "cursor-sync-api-base-url";
export const DEFAULT_API_BASE_URL = DEFAULT_PRODUCTION_API_BASE_URL;
export const STAGING_API_BASE_URL = DEFAULT_STAGING_API_BASE_URL;
export const LOCAL_API_PRESET = DEFAULT_LOCAL_API_BASE_URL;

export const API_BASE_CHANGED_EVENT = "cursor-sync-api-base-changed";

export function defaultApiBaseForMode(mode: string = import.meta.env.MODE): string {
  if (mode === "staging") {
    return STAGING_API_BASE_URL;
  }
  if (mode === "development") {
    return "";
  }
  return "";
}

export function normalizeApiBaseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path}`;
  } catch {
    return null;
  }
}

export type QueryApiOverride =
  | { action: "set"; url: string }
  | { action: "clear" }
  | null;

export function readQueryApiOverride(search: string): QueryApiOverride {
  const params = new URLSearchParams(
    search.startsWith("?") || search === "" ? search : `?${search}`
  );
  if (!params.has("api")) {
    return null;
  }
  const raw = params.get("api") ?? "";
  if (raw === "" || raw.toLowerCase() === "clear") {
    return { action: "clear" };
  }
  const normalized = normalizeApiBaseUrl(raw);
  if (!normalized) {
    return null;
  }
  return { action: "set", url: normalized };
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ResolveApiBaseOptions = {
  search?: string;
  storage?: StorageLike | null;
  buildTimeUrl?: string;
  mode?: string;
};

export function readBuildTimeApiUrl(explicit?: string): string | undefined {
  const raw = explicit ?? import.meta.env.VITE_API_URL;
  if (typeof raw !== "string" || !raw.trim()) {
    return undefined;
  }
  return raw;
}

export function isBuildTimeApiBaseConfigured(options?: {
  buildTimeUrl?: string;
}): boolean {
  const raw = readBuildTimeApiUrl(options?.buildTimeUrl);
  return raw !== undefined && normalizeApiBaseUrl(raw) !== null;
}

export function resolveApiBaseUrl(options: ResolveApiBaseOptions = {}): string {
  const mode = options.mode ?? import.meta.env.MODE;
  const storage =
    options.storage ??
    (typeof localStorage !== "undefined" ? localStorage : null);
  const search =
    options.search ??
    (typeof window !== "undefined" ? window.location.search : "");

  const allowClientOverride = !isProductionLikeMode(mode);

  const queryOverride = readQueryApiOverride(search);
  if (allowClientOverride && queryOverride?.action === "set") {
    storage?.setItem(API_BASE_STORAGE_KEY, queryOverride.url);
    return queryOverride.url;
  }
  if (queryOverride?.action === "clear") {
    storage?.removeItem(API_BASE_STORAGE_KEY);
  }

  if (allowClientOverride && storage) {
    const stored = storage.getItem(API_BASE_STORAGE_KEY);
    if (stored) {
      const normalized = normalizeApiBaseUrl(stored);
      if (normalized) {
        return normalized;
      }
      storage.removeItem(API_BASE_STORAGE_KEY);
    }
  }

  const buildTimeRaw = readBuildTimeApiUrl(options.buildTimeUrl);
  if (buildTimeRaw) {
    const normalized = normalizeApiBaseUrl(buildTimeRaw);
    if (normalized) {
      return normalized;
    }
  }

  return defaultApiBaseForMode(mode);
}

export function getApiBaseUrl(): string {
  const resolved = resolveApiBaseUrl();
  const normalized = normalizeApiBaseUrl(resolved);
  if (normalized) {
    return normalized;
  }
  const fallback = defaultApiBaseForMode(import.meta.env.MODE);
  return fallback;
}

export function getApiBaseUrlForAuth(): string | null {
  const mode = import.meta.env.MODE;
  const resolved = resolveApiBaseUrl();
  const normalized = normalizeApiBaseUrl(resolved);
  if (normalized) {
    return normalized;
  }
  if (mode === "development" && resolved === "") {
    return "";
  }
  if (mode === "staging") {
    const staging = normalizeApiBaseUrl(STAGING_API_BASE_URL);
    return staging;
  }
  return null;
}

export function isAuthApiBaseMissing(): boolean {
  return getApiBaseUrlForAuth() === null;
}

export function getApiBaseConfigurationError(): string | null {
  if (isAuthApiBaseMissing()) {
    return messageForAuthErrorCategory("empty_api_base");
  }
  return null;
}

export function isProductionLikeMode(mode: string = import.meta.env.MODE): boolean {
  return mode === "production" || mode === "staging";
}

export function getStoredApiOverride(
  storage: StorageLike = localStorage
): string | null {
  const stored = storage.getItem(API_BASE_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  return normalizeApiBaseUrl(stored);
}

export function setStoredApiOverride(
  url: string | null,
  storage: StorageLike = localStorage
): void {
  if (url === null) {
    storage.removeItem(API_BASE_STORAGE_KEY);
    notifyApiBaseChanged();
    return;
  }
  const normalized = normalizeApiBaseUrl(url);
  if (normalized) {
    storage.setItem(API_BASE_STORAGE_KEY, normalized);
    notifyApiBaseChanged();
  }
}

export function applyApiQueryParamFromLocation(): void {
  if (typeof window === "undefined") {
    return;
  }
  const queryOverride = readQueryApiOverride(window.location.search);
  if (queryOverride?.action === "set") {
    if (isProductionLikeMode()) {
      return;
    }
    localStorage.setItem(API_BASE_STORAGE_KEY, queryOverride.url);
    notifyApiBaseChanged();
    return;
  }
  if (queryOverride?.action === "clear") {
    localStorage.removeItem(API_BASE_STORAGE_KEY);
    notifyApiBaseChanged();
  }
}

export function notifyApiBaseChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(API_BASE_CHANGED_EVENT));
}
