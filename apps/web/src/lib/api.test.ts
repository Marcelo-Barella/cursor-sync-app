import { afterEach, describe, expect, it, vi } from "vitest";
import { signIn, signUp } from "./api";

describe("api auth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("signUp posts credentials and returns token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "test-token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await signUp("user@example.com", "password123");
    expect(result.token).toBe("test-token");
    expect(fetchMock).toHaveBeenCalledWith("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "password123" }),
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
