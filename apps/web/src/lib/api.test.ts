import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMe, signIn, signUp } from "./api";
import { getApiBaseUrl } from "./apiBase";

vi.mock("./apiBase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apiBase")>();
  return {
    ...actual,
    getApiBaseUrl: vi.fn(actual.getApiBaseUrl),
  };
});

describe("api auth", () => {
  beforeEach(() => {
    vi.mocked(getApiBaseUrl).mockReturnValue("https://api.example.com");
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
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "password123" }),
    });
  });

  it("signIn uses the resolved API base", async () => {
    vi.mocked(getApiBaseUrl).mockReturnValue("http://localhost:8100");
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

  it("signIn surfaces API error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Invalid email or password" }),
      })
    );

    await expect(signIn("user@example.com", "wrongpass")).rejects.toThrow(
      "Invalid email or password"
    );
  });
});
