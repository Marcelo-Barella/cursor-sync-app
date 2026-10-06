export const DEFAULT_PRODUCTION_API_BASE_URL = "https://api.sync.bergamota.dev";
export const DEFAULT_STAGING_API_BASE_URL =
  "https://api-staging-sync.bergamota.dev";
export const CURSOR_SYNC_STAGING_API_BASE_URL =
  "https://api-staging.cursor-sync.com";
export const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:8100";
export const DEFAULT_PUBLIC_SITE_HOST = "sync.bergamota.dev";
export const CURSOR_SYNC_STAGING_SITE_HOST = "staging.cursor-sync.com";

export function isCursorSyncStagingHost(hostname: string): boolean {
  return hostname === CURSOR_SYNC_STAGING_SITE_HOST;
}
