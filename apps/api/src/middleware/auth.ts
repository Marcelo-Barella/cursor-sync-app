import { createMiddleware } from "hono/factory";
import { verifySessionToken } from "../lib/session.js";

export type AuthVariables = {
  userId: string;
  email: string;
};

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = header.slice("Bearer ".length);
    try {
      const payload = verifySessionToken(token);
      c.set("userId", payload.sub);
      c.set("email", payload.email);
      await next();
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }
);
