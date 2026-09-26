import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, "../..");
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8100";

export default defineConfig(({ mode }) => {
  const repoEnv = loadEnv(mode, repoRoot, "");
  const webEnv = loadEnv(mode, webRoot, "");
  const viteApiUrl = pickNonEmpty(webEnv.VITE_API_URL, repoEnv.VITE_API_URL);

  const define: Record<string, string> = {};
  if (viteApiUrl) {
    define["import.meta.env.VITE_API_URL"] = JSON.stringify(viteApiUrl);
  }

  return {
    envDir: repoRoot,
    define,
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        "/auth": { target: apiTarget, changeOrigin: true },
        "/health": { target: apiTarget, changeOrigin: true },
      },
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
