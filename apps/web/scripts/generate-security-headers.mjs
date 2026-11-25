import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(webRoot, "..");
const repoRoot = path.resolve(appRoot, "../..");

function parseApiOriginForCsp(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    if (
      url.protocol === "http:" &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1"
    ) {
      return null;
    }
    if (url.username || url.password) {
      return null;
    }
    const pathPart = url.pathname.replace(/\/+$/, "");
    if (pathPart !== "" && pathPart !== "/") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy(apiOrigin) {
  const directives = [
    "default-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "worker-src 'self' blob:",
  ];
  return directives.join("; ");
}

const REFERRER_POLICY = "strict-origin-when-cross-origin";
const PERMISSIONS_POLICY =
  "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

function loadViteApiUrlFromRepoEnv() {
  const envPath = path.join(repoRoot, ".env");
  const examplePath = path.join(repoRoot, ".env.example");
  for (const candidate of [envPath, examplePath]) {
    if (!fs.existsSync(candidate)) {
      continue;
    }
    const text = fs.readFileSync(candidate, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq === -1) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      if (key === "VITE_API_URL") {
        return trimmed.slice(eq + 1).trim();
      }
    }
  }
  return undefined;
}

const viteApiUrl = process.env.VITE_API_URL ?? loadViteApiUrlFromRepoEnv();
const apiOrigin = parseApiOriginForCsp(viteApiUrl);

if (!apiOrigin) {
  console.error(
    "[generate-security-headers] VITE_API_URL must be a valid origin (https or local http)."
  );
  if (process.env.SKIP_SECURITY_HEADERS === "1") {
    console.warn("[generate-security-headers] SKIP_SECURITY_HEADERS=1 — skipping.");
    process.exit(0);
  }
  process.exit(1);
}

const csp = buildContentSecurityPolicy(apiOrigin);

const nginxTemplatePath = path.join(appRoot, "nginx.conf.template");
const nginxOutPath = path.join(appRoot, "nginx.conf");
const template = fs.readFileSync(nginxTemplatePath, "utf8");
const nginx = template
  .replaceAll("__CONTENT_SECURITY_POLICY__", csp)
  .replaceAll("__REFERRER_POLICY__", REFERRER_POLICY)
  .replaceAll("__PERMISSIONS_POLICY__", PERMISSIONS_POLICY)
  .replaceAll("__X_FRAME_OPTIONS__", "DENY");
fs.writeFileSync(nginxOutPath, nginx);

const metaPath = path.join(appRoot, ".generated-security-headers.json");
fs.writeFileSync(
  metaPath,
  `${JSON.stringify({ apiOrigin, csp, generatedAt: new Date().toISOString() }, null, 2)}\n`
);

console.log(
  `[generate-security-headers] nginx connect-src API origin: ${apiOrigin}`
);