export type AuthResponse = {
  token: string;
};

export type AuthError = {
  error: string;
};

import { getApiBaseUrlForAuth, isAuthApiBaseMissing } from "./apiBase";
import {
  AuthApiError,
  messageForAuthErrorCategory,
  type AuthErrorCategory,
} from "./authErrors";

const AUTH_FETCH_TIMEOUT_MS = 30_000;

function requireApiBaseUrl(): string {
  if (isAuthApiBaseMissing()) {
    throw new AuthApiError(
      "empty_api_base",
      messageForAuthErrorCategory("empty_api_base")
    );
  }
  const base = getApiBaseUrlForAuth();
  if (!base) {
    throw new AuthApiError(
      "empty_api_base",
      messageForAuthErrorCategory("empty_api_base")
    );
  }
  return base;
}

function inferValidationCategory(
  body: unknown,
  email: string,
  mode: "sign-in" | "sign-up"
): AuthErrorCategory {
  if (body && typeof body === "object" && "error" in body) {
    const apiMessage = String((body as AuthError).error).toLowerCase();
    if (apiMessage.includes("email")) {
      return "validation_email";
    }
    if (apiMessage.includes("password")) {
      return "validation_password";
    }
  }
  if (!email.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "validation_email";
  }
  if (mode === "sign-up") {
    return "validation_password";
  }
  return "validation_email";
}

function categoryForHttpStatus(
  status: number,
  mode: "sign-in" | "sign-up",
  hasAuthBody: boolean
): AuthErrorCategory {
  if (status === 429) {
    return "rate_limit";
  }
  if (status === 404) {
    return "unavailable";
  }
  if (status >= 500) {
    return "server";
  }
  if (status === 409 && mode === "sign-up" && hasAuthBody) {
    return "email_taken";
  }
  if (status === 401 && mode === "sign-in" && hasAuthBody) {
    return "invalid_credentials";
  }
  if (status === 400 && hasAuthBody) {
    return "validation_password";
  }
  if (status === 502 || status === 503) {
    return "server";
  }
  if (!hasAuthBody) {
    if (status >= 500) {
      return "server";
    }
    return "unavailable";
  }
  return "unavailable";
}

function messageFromApiBody(
  body: unknown,
  category: AuthErrorCategory,
  email: string,
  mode: "sign-in" | "sign-up"
): string {
  if (category === "validation_password" || category === "validation_email") {
    if (body && typeof body === "object" && "error" in body) {
      const inferred = inferValidationCategory(body, email, mode);
      return messageForAuthErrorCategory(inferred);
    }
  }
  if (body && typeof body === "object" && "error" in body) {
    if (category === "email_taken") {
      return messageForAuthErrorCategory("email_taken");
    }
    if (category === "invalid_credentials") {
      return messageForAuthErrorCategory("invalid_credentials");
    }
    if (category === "rate_limit") {
      return messageForAuthErrorCategory("rate_limit");
    }
  }
  return messageForAuthErrorCategory(category);
}

function joinApiPath(base: string, path: string): string {
  return base ? `${base}${path}` : path;
}

async function authFetch(path: string, init: RequestInit): Promise<Response> {
  const base = requireApiBaseUrl();
  const url = joinApiPath(base, path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AuthApiError("timeout", messageForAuthErrorCategory("timeout"));
    }
    throw new AuthApiError("network", messageForAuthErrorCategory("network"));
  } finally {
    clearTimeout(timeout);
  }
}

async function parseAuthJson<T>(
  response: Response,
  mode: "sign-in" | "sign-up",
  email: string
): Promise<T> {
  const data = await response.json().catch(() => null);
  const hasAuthBody =
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    String((data as AuthError).error).trim().length > 0;

  if (!response.ok) {
    let category = categoryForHttpStatus(response.status, mode, hasAuthBody);
    if (response.status === 400 && hasAuthBody) {
      category = inferValidationCategory(data, email, mode);
    }
    if (
      response.status === 409 &&
      mode === "sign-up" &&
      hasAuthBody &&
      /already|registered|in use/i.test(String((data as AuthError).error))
    ) {
      category = "email_taken";
    }
    const message = messageFromApiBody(data, category, email, mode);
    throw new AuthApiError(category, message, response.status);
  }
  return data as T;
}

export async function signUp(email: string, password: string): Promise<AuthResponse> {
  const response = await authFetch("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseAuthJson<AuthResponse>(response, "sign-up", email);
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const response = await authFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseAuthJson<AuthResponse>(response, "sign-in", email);
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as AuthError).error)
        : messageForAuthErrorCategory("server");
    throw new Error(message);
  }
  return data as T;
}

export async function getMe(token: string): Promise<{ id: string; email: string }> {
  const base = requireApiBaseUrl();
  const response = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(response);
}

export type LoginCodeResponse = {
  code: string;
  redirect_uri: string;
  state?: string;
};

export async function issueLoginCode(
  token: string,
  redirectUri: string,
  state?: string | null
): Promise<LoginCodeResponse> {
  const body: { redirect_uri: string; state?: string } = {
    redirect_uri: redirectUri,
  };
  if (state != null && state !== "") {
    body.state = state;
  }

  const base = requireApiBaseUrl();
  const response = await fetch(`${base}/login/code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return parseJson<LoginCodeResponse>(response);
}
