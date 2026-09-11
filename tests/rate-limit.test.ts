import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit, resetRateLimits } from "../lib/rate-limit";

describe("rate limiting", () => {
  beforeEach(() => resetRateLimits());
  it("autorise le quota puis bloque les tentatives suivantes", () => {
    expect(rateLimit("user", 2, 900).allowed).toBe(true);
    expect(rateLimit("user", 2, 900).allowed).toBe(true);
    const blocked = rateLimit("user", 2, 900);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
  it("isole les utilisateurs", () => {
    rateLimit("a", 1, 900);
    expect(rateLimit("b", 1, 900).allowed).toBe(true);
  });
});
