export type AuthResponse = {
  token: string;
};

export type AuthError = {
  error: string;
};

import { getApiBaseUrl, normalizeApiBaseUrl } from "./apiBase";
import {
  AuthApiError,
  messageForAuthErrorCategory,
  type AuthErrorCategory,
} from "./authErrors";

function requireApiBaseUrl(): string {
  const base = getApiBaseUrl();
  const normalized = normalizeApiBaseUrl(base);
  if (!normalized) {
    throw new AuthApiError(
      "misconfigured",
      messageForAuthErrorCategory("misconfigured")
    );
  }
  return normalized;
}

function categoryForHttpStatus(
  status: number,
  mode: "sign-in" | "sign-up"
): AuthErrorCategory {
  if (status === 404) {
    return "not_found";
  }
  if (status >= 500) {
    return "server";
  }
  if (status === 409 && mode === "sign-up") {
    return "email_taken";
  }
  if (status === 401 && mode === "sign-in") {
    return "invalid_credentials";
  }
  if (status === 400) {
    return mode === "sign-up" ? "validation" : "invalid_credentials";
  }
  return "unknown";
}

function messageFromApiBody(
  body: unknown,
  category: AuthErrorCategory
): string {
  if (body && typeof body === "object" && "error" in body) {
    const apiMessage = String((body as AuthError).error);
    if (category === "email_taken" && /already/i.test(apiMessage)) {
      return messageForAuthErrorCategory("email_taken");
    }
    if (category === "invalid_credentials") {
      return messageForAuthErrorCategory("invalid_credentials");
    }
    if (category === "validation") {
      return messageForAuthErrorCategory("validation");
    }
    if (apiMessage.trim()) {
      return apiMessage;
    }
  }
  return messageForAuthErrorCategory(category);
}

async function authFetch(path: string, init: RequestInit): Promise<Response> {
  const base = requireApiBaseUrl();
  const url = `${base}${path}`;

  try {
    return await fetch(url, init);
  } catch {
    throw new AuthApiError(
      "network",
      messageForAuthErrorCategory("network")
    );
  }
}

async function parseAuthJson<T>(
  response: Response,
  mode: "sign-in" | "sign-up"
): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const category = categoryForHttpStatus(response.status, mode);
    const message = messageFromApiBody(data, category);
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
  return parseAuthJson<AuthResponse>(response, "sign-up");
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const response = await authFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseAuthJson<AuthResponse>(response, "sign-in");
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as AuthError).error)
        : messageForAuthErrorCategory("unknown");
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
