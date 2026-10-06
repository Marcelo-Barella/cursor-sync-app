import { Hono } from "hono";
import { cors } from "hono/cors";
import { pingDatabase } from "./db/pool.js";
import { getBuildInfo } from "./lib/build-info.js";
import { resolveCorsOrigin } from "./lib/cors.js";
import { authRoutes } from "./routes/auth.js";
import { configsRoutes } from "./routes/configs.js";
import { keysRoutes } from "./routes/keys.js";
import { loginRoutes } from "./routes/login.js";
import { storageRoutes } from "./routes/storage.js";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: (origin) => resolveCorsOrigin(origin),
      allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.get("/health", async (c) => {
    const build = getBuildInfo();
    try {
      await pingDatabase();
      return c.json({ status: "ok", ...build });
    } catch {
      return c.json({ status: "error", ...build }, 503);
    }
  });

  app.route("/auth", authRoutes);
  app.route("/configs", configsRoutes);
  app.route("/v1/keys", keysRoutes);
  app.route("/v1/storage", storageRoutes);
  app.route("/", loginRoutes);

  return app;
}
