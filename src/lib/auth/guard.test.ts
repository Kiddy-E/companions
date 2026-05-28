import { describe, it, expect } from "vitest";
import { requireAuth, requireAdmin, requireScope, ApiError, errorResponse } from "./guard";
import { Role } from "@/generated/prisma";

const sessionAdmin = {
  type: "session" as const,
  userId: "user_1",
  role: Role.ADMIN,
  username: "admin",
};

const sessionMember = {
  type: "session" as const,
  userId: "user_2",
  role: Role.MEMBER,
  username: "member",
};

const tokenReadOnly = {
  type: "token" as const,
  userId: "user_3",
  scopes: ["events:read", "pets:read"],
};

describe("requireAuth", () => {
  it("returns context when authenticated", () => {
    expect(requireAuth(sessionAdmin)).toBe(sessionAdmin);
  });

  it("throws 401 when context is null", () => {
    expect(() => requireAuth(null)).toThrowError(ApiError);
    try {
      requireAuth(null);
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
    }
  });
});

describe("requireAdmin", () => {
  it("passes for ADMIN session", () => {
    expect(requireAdmin(sessionAdmin)).toBe(sessionAdmin);
  });

  it("throws 403 for MEMBER session", () => {
    try {
      requireAdmin(sessionMember);
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
      expect((e as ApiError).code).toBe("FORBIDDEN");
    }
  });

  it("throws 403 for token auth (not session)", () => {
    try {
      requireAdmin(tokenReadOnly);
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
    }
  });
});

describe("requireScope", () => {
  it("session context always passes regardless of scope", () => {
    expect(requireScope(sessionMember, "events:write")).toBe(sessionMember);
  });

  it("token with correct scope passes", () => {
    expect(requireScope(tokenReadOnly, "events:read")).toBe(tokenReadOnly);
  });

  it("token missing scope throws 403", () => {
    try {
      requireScope(tokenReadOnly, "events:write");
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
      expect((e as ApiError).message).toContain("events:write");
    }
  });

  it("null context throws 401", () => {
    try {
      requireScope(null, "pets:read");
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
    }
  });
});

describe("ApiError", () => {
  it("creates error with correct properties", () => {
    const err = new ApiError(404, "NOT_FOUND", "Resource not found");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
  });
});

describe("errorResponse", () => {
  it("maps ApiError to correct HTTP response", async () => {
    const err = new ApiError(422, "VALIDATION_ERROR", "Invalid input");
    const res = errorResponse(err);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("maps unknown errors to 500", async () => {
    const res = errorResponse(new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
