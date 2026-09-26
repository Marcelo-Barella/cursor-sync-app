import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMe, signIn, signUp, verifyEmail } from "./api";
import { AuthApiError } from "./authErrors";
import { getApiBaseUrlForAuth, isAuthApiBaseMissing } from "./apiBase";

vi.mock("./apiBase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apiBase")>();
  return {
    ...actual,
    getApiBaseUrlForAuth: vi.fn(actual.getApiBaseUrlForAuth),
    isAuthApiBaseMissing: vi.fn(actual.isAuthApiBaseMissing),
  };
});

describe("api auth", () => {
  beforeEach(() => {
    vi.mocked(isAuthApiBaseMissing).mockReturnValue(false);
    vi.mocked(getApiBaseUrlForAuth).mockReturnValue("https://api.example.com");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("signUp posts credentials to the resolved API base", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "test-token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await signUp("user@example.com", "password123");
    expect(result.token).toBe("test-token");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/auth/signup",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
  });

  it("signIn uses the resolved API base", async () => {
    vi.mocked(getApiBaseUrlForAuth).mockReturnValue("http://localhost:8100");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "tok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await signIn("user@example.com", "password123");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8100/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("getMe uses the resolved API base", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1", email: "user@example.com" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getMe("jwt");
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/auth/me", {
      headers: { Authorization: "Bearer jwt" },
    });
  });

  it("signIn maps 401 responses to invalid credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Invalid email or password" }),
      })
    );

    await expect(signIn("user@example.com", "wrongpass")).rejects.toEqual(
      expect.objectContaining<Partial<AuthApiError>>({
        category: "invalid_credentials",
      })
    );
  });

  it("signIn maps 404 responses to unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => null,
      })
    );

    await expect(signIn("user@example.com", "password123")).rejects.toEqual(
      expect.objectContaining({ category: "unavailable" })
    );
  });

  it("signIn maps network failures to network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(signIn("user@example.com", "password123")).rejects.toEqual(
      expect.objectContaining({ category: "network" })
    );
  });

  it("signUp maps 409 responses to email taken", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: "Email already registered" }),
      })
    );

    await expect(signUp("user@example.com", "password123")).rejects.toEqual(
      expect.objectContaining({ category: "email_taken" })
    );
  });

  it("verifyEmail posts token to verify-email", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, emailVerified: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyEmail("raw-token");
    expect(result.emailVerified).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/auth/verify-email",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "raw-token" }),
      })
    );
  });

  it("rejects a missing API base before calling fetch", async () => {
    vi.mocked(isAuthApiBaseMissing).mockReturnValue(true);
    vi.mocked(getApiBaseUrlForAuth).mockReturnValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(signIn("user@example.com", "password123")).rejects.toEqual(
      expect.objectContaining({ category: "empty_api_base" })
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
