import { DEFAULT_PUBLIC_SITE_HOST } from "./defaults";

export function getPublicSiteHost(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_HOST;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return DEFAULT_PUBLIC_SITE_HOST;
}
