export type AuthResponse = {
  token: string;
};

export type AuthError = {
  error: string;
};

const API_BASE = import.meta.env.VITE_API_URL ?? "";

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
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJson<AuthResponse>(response);
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJson<AuthResponse>(response);
}

export async function getMe(token: string): Promise<{ id: string; email: string }> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(response);
}
