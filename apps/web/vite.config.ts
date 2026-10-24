import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, "../..");

export default defineConfig(({ mode }) => {
  const repoEnv = loadEnv(mode, repoRoot, "");
  const webEnv = loadEnv(mode, webRoot, "");
  const viteApiUrl = pickNonEmpty(webEnv.VITE_API_URL, repoEnv.VITE_API_URL);
  const vitePublicSiteHost = pickNonEmpty(
    webEnv.VITE_PUBLIC_SITE_HOST,
    repoEnv.VITE_PUBLIC_SITE_HOST
  );

  const define: Record<string, string> = {};
  if (viteApiUrl) {
    define["import.meta.env.VITE_API_URL"] = JSON.stringify(viteApiUrl);
  }
  if (vitePublicSiteHost) {
    define["import.meta.env.VITE_PUBLIC_SITE_HOST"] =
      JSON.stringify(vitePublicSiteHost);
  }

  return {
    envDir: repoRoot,
    define,
    plugins: [react()],
    server: {
      port: 3000,
    },
  };
});

function pickNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}
