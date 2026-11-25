import {
  API_BASE_STORAGE_KEY,
  isAllowedDevApiOrigin,
  normalizeApiBaseUrl,
  setStoredApiOverride,
} from "./apiBase";

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
  if (!normalized || !isAllowedDevApiOrigin(normalized)) {
    return null;
  }
  return { action: "set", url: normalized };
}

export function applyDevApiQueryParamFromLocation(): void {
  if (typeof window === "undefined") {
    return;
  }
  const queryOverride = readQueryApiOverride(window.location.search);
  if (queryOverride?.action === "set") {
    setStoredApiOverride(queryOverride.url);
    return;
  }
  if (queryOverride?.action === "clear") {
    setStoredApiOverride(null);
  }
}

export { API_BASE_STORAGE_KEY };