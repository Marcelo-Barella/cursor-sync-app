export type AuthResponse = {
  token: string;
};

export type AuthError = {
  error: string;
};

import { getApiBaseUrl } from "./apiBase";

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as AuthError).error)
        : "Something went wrong";
    throw new Error(message);
  }
  return data as T;
}

export async function signUp(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJson<AuthResponse>(response);
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJson<AuthResponse>(response);
}

export async function getMe(token: string): Promise<{ id: string; email: string }> {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
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

  const response = await fetch(`${getApiBaseUrl()}/login/code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return parseJson<LoginCodeResponse>(response);
}
