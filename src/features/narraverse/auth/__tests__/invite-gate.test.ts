import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "../../../../lib/auth/rate-limiter.js";

describe("Rate Limiter", () => {
  it("allows requests within limit", () => {
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit("test-key-a", 5, 60_000);
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks requests exceeding limit", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-key-b", 5, 60_000);
    }
    const blocked = checkRateLimit("test-key-b", 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("isolates different keys", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("isolated-key-a", 5, 60_000);
    }
    const other = checkRateLimit("isolated-key-b", 5, 60_000);
    expect(other.allowed).toBe(true);
  });

  it("returns correct remaining count", () => {
    const r1 = checkRateLimit("remaining-key", 10, 60_000);
    expect(r1.remaining).toBe(9);
    const r2 = checkRateLimit("remaining-key", 10, 60_000);
    expect(r2.remaining).toBe(8);
  });

  it("provides a resetAt timestamp in the future", () => {
    const r = checkRateLimit("future-key", 5, 60_000);
    expect(r.resetAt).toBeGreaterThan(Date.now());
  });
});
