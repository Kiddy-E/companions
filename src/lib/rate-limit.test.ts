import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests within limit", () => {
    const config = { maxRequests: 3, windowMs: 60_000 };
    const r1 = checkRateLimit("test:1", config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit("test:1", config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit("test:1", config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks when limit exceeded", () => {
    const config = { maxRequests: 2, windowMs: 60_000 };
    checkRateLimit("test:2", config);
    checkRateLimit("test:2", config);
    const blocked = checkRateLimit("test:2", config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    const config = { maxRequests: 1, windowMs: 60_000 };
    checkRateLimit("test:3", config);
    const blocked = checkRateLimit("test:3", config);
    expect(blocked.allowed).toBe(false);

    // Advance past window
    vi.advanceTimersByTime(61_000);

    const reset = checkRateLimit("test:3", config);
    expect(reset.allowed).toBe(true);
  });

  it("isolates different identifiers", () => {
    const config = { maxRequests: 1, windowMs: 60_000 };
    checkRateLimit("test:A", config);
    const blockedA = checkRateLimit("test:A", config);
    expect(blockedA.allowed).toBe(false);

    // Different key not affected
    const okB = checkRateLimit("test:B", config);
    expect(okB.allowed).toBe(true);
  });

  it("returns correct resetAt timestamp", () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const config = { maxRequests: 5, windowMs: 60_000 };
    const result = checkRateLimit("test:ts", config);
    expect(result.resetAt).toBe(new Date("2025-01-01T00:01:00Z").getTime());
  });
});
