import {
  API_BASE_STORAGE_KEY,
  LEGACY_API_BASE_STORAGE_KEYS,
  notifyApiBaseChanged,
} from "./apiBase";

export function purgeStoredApiOverrides(
  storage: Storage = localStorage
): void {
  for (const key of LEGACY_API_BASE_STORAGE_KEYS) {
    storage.removeItem(key);
  }
  storage.removeItem(API_BASE_STORAGE_KEY);
}

export function stripApiQueryParamFromLocation(): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (!url.searchParams.has("api")) {
    return;
  }
  url.searchParams.delete("api");
  const query = url.searchParams.toString();
  const next = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
  window.history.replaceState(null, "", next);
}

export async function bootstrapApiBaseFromLocation(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  purgeStoredApiOverrides();
  if (import.meta.env.DEV) {
    const { applyDevApiQueryParamFromLocation } = await import("./apiBase.dev");
    applyDevApiQueryParamFromLocation();
  }
  stripApiQueryParamFromLocation();
  notifyApiBaseChanged();
}