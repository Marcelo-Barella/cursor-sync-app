import { DEFAULT_LOCAL_API_BASE_URL } from "./defaults";
import { messageForAuthErrorCategory } from "./authErrors";

export const API_BASE_STORAGE_KEY = "cursor-sync-api-base-url";
export const LEGACY_API_BASE_STORAGE_KEYS = ["cursor-sync-api-base-url"] as const;
export const LOCAL_API_PRESET = DEFAULT_LOCAL_API_BASE_URL;

export const API_BASE_CHANGED_EVENT = "cursor-sync-api-base-changed";

export function defaultApiBaseForMode(
  mode: string = import.meta.env.MODE
): string {
  if (mode === "development") {
    return LOCAL_API_PRESET;
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
    if (url.username || url.password) {
      return null;
    }
    const path = url.pathname.replace(/\/+$/, "");
    if (path !== "" && path !== "/") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function parseStrictProductionApiOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      return null;
    }
    if (url.username || url.password) {
      return null;
    }
    const path = url.pathname.replace(/\/+$/, "");
    if (path !== "" && path !== "/") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function readDevApiAllowlistOrigins(): string[] {
  const raw = import.meta.env.VITE_DEV_API_ALLOWLIST;
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => normalizeApiBaseUrl(entry))
    .filter((origin): origin is string => origin !== null);
}

export function isAllowedDevApiOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return true;
    }
    const allowlist = readDevApiAllowlistOrigins();
    return allowlist.includes(url.origin);
  } catch {
    return false;
  }
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ResolveApiBaseOptions = {
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
  if (!raw) {
    return false;
  }
  if (import.meta.env.DEV) {
    return normalizeApiBaseUrl(raw) !== null;
  }
  return parseStrictProductionApiOrigin(raw) !== null;
}

function readAllowedStoredDevOverride(
  storage: StorageLike | null
): string | null {
  if (!import.meta.env.DEV || !storage) {
    return null;
  }
  const stored = storage.getItem(API_BASE_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  const normalized = normalizeApiBaseUrl(stored);
  if (!normalized || !isAllowedDevApiOrigin(normalized)) {
    storage.removeItem(API_BASE_STORAGE_KEY);
    return null;
  }
  return normalized;
}

function resolveBundledApiBase(
  options: ResolveApiBaseOptions,
  mode: string
): string {
  const buildTimeRaw = readBuildTimeApiUrl(options.buildTimeUrl);
  if (buildTimeRaw) {
    if (import.meta.env.DEV) {
      const devOrigin = normalizeApiBaseUrl(buildTimeRaw);
      if (devOrigin && isAllowedDevApiOrigin(devOrigin)) {
        return devOrigin;
      }
    } else {
      const productionOrigin = parseStrictProductionApiOrigin(buildTimeRaw);
      if (productionOrigin) {
        return productionOrigin;
      }
    }
  }
  return defaultApiBaseForMode(mode);
}

export function resolveApiBaseUrl(options: ResolveApiBaseOptions = {}): string {
  const mode = options.mode ?? import.meta.env.MODE;
  const storage =
    options.storage ??
    (typeof localStorage !== "undefined" ? localStorage : null);

  if (!import.meta.env.DEV) {
    return resolveBundledApiBase(options, mode);
  }

  const stored = readAllowedStoredDevOverride(storage);
  if (stored) {
    return stored;
  }

  return resolveBundledApiBase(options, mode);
}

export function getApiBaseUrl(): string {
  const resolved = resolveApiBaseUrl();
  const normalized = normalizeApiBaseUrl(resolved);
  if (normalized) {
    return normalized;
  }
  return defaultApiBaseForMode(import.meta.env.MODE);
}

export function getApiBaseUrlForAuth(): string | null {
  if (!import.meta.env.DEV) {
    const buildTimeRaw = readBuildTimeApiUrl();
    if (!buildTimeRaw) {
      return null;
    }
    return parseStrictProductionApiOrigin(buildTimeRaw);
  }
  const resolved = resolveApiBaseUrl();
  const normalized = normalizeApiBaseUrl(resolved);
  if (normalized) {
    return normalized;
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
  if (!import.meta.env.DEV) {
    return null;
  }
  return readAllowedStoredDevOverride(storage);
}

export function setStoredApiOverride(
  url: string | null,
  storage: StorageLike = localStorage
): void {
  if (!import.meta.env.DEV) {
    return;
  }
  if (url === null) {
    storage.removeItem(API_BASE_STORAGE_KEY);
    notifyApiBaseChanged();
    return;
  }
  const normalized = normalizeApiBaseUrl(url);
  if (normalized && isAllowedDevApiOrigin(normalized)) {
    storage.setItem(API_BASE_STORAGE_KEY, normalized);
    notifyApiBaseChanged();
  }
}

export function notifyApiBaseChanged(): void {
  if (typeof window === "undefined" || !import.meta.env.DEV) {
    return;
  }
  window.dispatchEvent(new Event(API_BASE_CHANGED_EVENT));
}