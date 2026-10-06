import {
  CURSOR_SYNC_STAGING_SITE_HOST,
  DEFAULT_PUBLIC_SITE_HOST,
  isCursorSyncStagingHost,
} from "./defaults";

export function getPublicSiteHost(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_HOST;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }
  if (
    typeof window !== "undefined" &&
    isCursorSyncStagingHost(window.location.hostname)
  ) {
    return CURSOR_SYNC_STAGING_SITE_HOST;
  }
  return DEFAULT_PUBLIC_SITE_HOST;
}
