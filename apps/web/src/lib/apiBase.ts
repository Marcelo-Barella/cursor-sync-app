import { DEFAULT_LOCAL_API_BASE_URL } from "./defaults";
import { messageForAuthErrorCategory } from "./authErrors";

export const API_BASE_STORAGE_KEY = "cursor-sync-api-base-url";
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
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path}`;
  } catch {
    return null;
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
  return raw !== undefined && normalizeApiBaseUrl(raw) !== null;
}

export function resolveApiBaseUrl(options: ResolveApiBaseOptions = {}): string {
  const mode = options.mode ?? import.meta.env.MODE;

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
  return defaultApiBaseForMode(import.meta.env.MODE);
}

export function getApiBaseUrlForAuth(): string | null {
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
  _storage: StorageLike = localStorage
): string | null {
  return null;
}

export function setStoredApiOverride(
  _url: string | null,
  _storage: StorageLike = localStorage
): void {}

export function notifyApiBaseChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(API_BASE_CHANGED_EVENT));
}