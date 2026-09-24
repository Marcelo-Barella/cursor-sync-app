import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, "../..");

export default defineConfig({
  envDir: repoRoot,
  plugins: [react()],
  server: {
    port: 3000,
  },
});
