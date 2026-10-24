export function getPublicSiteHost(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_HOST;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }
  if (typeof window !== "undefined" && window.location.hostname) {
    return window.location.hostname;
  }
  return "";
}
