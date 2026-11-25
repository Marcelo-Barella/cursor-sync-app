import { API_BASE_STORAGE_KEY } from "./apiBase";

type StorageLike = Pick<Storage, "removeItem">;

export function purgeStoredApiOverrides(
  storage: StorageLike = localStorage
): void {
  if (typeof storage === "undefined" || !storage) {
    return;
  }
  storage.removeItem(API_BASE_STORAGE_KEY);
}

export function stripApiQueryParamFromLocation(): void {
  if (typeof window === "undefined") {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  if (!params.has("api")) {
    return;
  }
  params.delete("api");
  const query = params.toString();
  const next =
    window.location.pathname +
    (query ? `?${query}` : "") +
    window.location.hash;
  window.history.replaceState(null, "", next);
}

export function bootstrapApiBaseFromLocation(): void {
  if (typeof window === "undefined") {
    return;
  }
  purgeStoredApiOverrides();
  stripApiQueryParamFromLocation();
}