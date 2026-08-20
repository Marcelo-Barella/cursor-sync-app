import { Hono } from "hono";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { createLoginCode } from "../lib/login-codes.js";
import { verifyLoginPassword } from "../lib/password.js";
import {
  appendCodeToRedirectUri,
  isAllowedRedirectUri,
} from "../lib/redirect-uri.js";

const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  redirect_uri: z.string().min(1),
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loginFormHtml(redirectUri: string, error?: string): string {
  const errorBlock = error
    ? `<p style="color:#b00020">${escapeHtml(error)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cursor Sync — Sign in</title>
</head>
<body>
  <h1>Cursor Sync</h1>
  ${errorBlock}
  <form method="post" action="/login">
    <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
    <p>
      <label for="email">Email</label><br>
      <input id="email" name="email" type="email" required autocomplete="username">
    </p>
    <p>
      <label for="password">Password</label><br>
      <input id="password" name="password" type="password" required autocomplete="current-password">
    </p>
    <p><button type="submit">Sign in</button></p>
  </form>
</body>
</html>`;
}

function loginSuccessHtml(redirectWithCode: string, code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectWithCode)}">
  <title>Cursor Sync — Signed in</title>
</head>
<body>
  <h1>Opening Cursor</h1>
  <p>If Cursor did not open, paste this code in the extension:</p>
  <p><code>${escapeHtml(code)}</code></p>
  <p><a href="${escapeHtml(redirectWithCode)}">Open Cursor</a></p>
</body>
</html>`;
}

function buildSuccessRedirect(code: string, redirectUri: string): string {
  const params = new URLSearchParams({
    code,
    redirect_uri: redirectUri,
  });
  return `/login/success?${params.toString()}`;
}

function invalidRedirectHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Cursor Sync — Invalid request</title>
</head>
<body>
  <h1>Invalid request</h1>
  <p>Missing or invalid redirect URI.</p>
</body>
</html>`;
}

async function verifyCredentials(
  email: string,
  password: string
): Promise<{ id: string; email: string } | null> {
  const result = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
  }>(`SELECT id, email, password_hash FROM users WHERE email = $1`, [email]);

  const user = result.rows[0];
  const valid = await verifyLoginPassword(user?.password_hash ?? null, password);
  if (!user || !valid) {
    return null;
  }

  return { id: user.id, email: user.email };
}

function wantsJson(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return true;
  }
  const accept = c.req.header("accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

export const loginRoutes = new Hono();

loginRoutes.get("/login", (c) => {
  const redirectUri = c.req.query("redirect_uri") ?? "";
  if (!isAllowedRedirectUri(redirectUri)) {
    return c.html(invalidRedirectHtml(), 400);
  }
  return c.html(loginFormHtml(redirectUri));
});

loginRoutes.get("/login/success", (c) => {
  const code = c.req.query("code") ?? "";
  const redirectUri = c.req.query("redirect_uri") ?? "";
  if (!code || !isAllowedRedirectUri(redirectUri)) {
    return c.html(invalidRedirectHtml(), 400);
  }
  const redirectWithCode = appendCodeToRedirectUri(redirectUri, code);
  return c.html(loginSuccessHtml(redirectWithCode, code));
});

loginRoutes.post("/login", async (c) => {
  const contentType = c.req.header("content-type") ?? "";
  const isJsonRequest = contentType.includes("application/json");
  const raw = isJsonRequest
    ? await c.req.json().catch(() => null)
    : await c.req.parseBody().catch(() => null);

  const parsed = loginInputSchema.safeParse(raw);
  const redirectUri =
    typeof raw === "object" && raw !== null && "redirect_uri" in raw
      ? String(raw.redirect_uri)
      : "";

  if (!parsed.success) {
    if (!redirectUri || !isAllowedRedirectUri(redirectUri)) {
      if (wantsJson(c) || isJsonRequest) {
        return c.json({ error: "Invalid request" }, 400);
      }
      return c.html(invalidRedirectHtml(), 400);
    }
    if (wantsJson(c) || isJsonRequest) {
      return c.json({ error: "Invalid email or password" }, 400);
    }
    return c.html(loginFormHtml(redirectUri, "Invalid email or password"), 400);
  }

  const { email, password, redirect_uri: validRedirectUri } = parsed.data;
  if (!isAllowedRedirectUri(validRedirectUri)) {
    if (wantsJson(c) || isJsonRequest) {
      return c.json({ error: "Invalid request" }, 400);
    }
    return c.html(invalidRedirectHtml(), 400);
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    if (wantsJson(c) || isJsonRequest) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    return c.html(
      loginFormHtml(validRedirectUri, "Invalid email or password"),
      401
    );
  }

  const code = await createLoginCode(user.id);
  const redirectWithCode = appendCodeToRedirectUri(validRedirectUri, code);

  if (wantsJson(c) || isJsonRequest) {
    return c.json({ code, redirect_uri: redirectWithCode });
  }

  return c.redirect(buildSuccessRedirect(code, validRedirectUri), 302);
});
