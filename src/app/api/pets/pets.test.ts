import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";

// vi.hoisted ensures these run before the hoisted vi.mock factory
const { mockGetAuthContext } = vi.hoisted(() => ({
  mockGetAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => {
  class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  }
  function errorResponse(err: unknown) {
    if (err instanceof ApiError) {
      return Response.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
  return {
    ApiError,
    errorResponse,
    requireScope: vi.fn().mockImplementation((ctx: unknown) => ctx),
    requireAuth: vi.fn().mockImplementation((ctx: unknown) => ctx),
    requireAdmin: vi.fn().mockImplementation((ctx: unknown) => ctx),
    requireSession: vi.fn().mockImplementation((ctx: unknown) => ctx),
    getAuthContext: mockGetAuthContext,
  };
});

// Set up default resolved value for getAuthContext
mockGetAuthContext.mockResolvedValue({
  type: "session",
  userId: "user_1",
  role: Role.ADMIN,
  name: "Admin",
});

const mockPets = [
  {
    id: "pet_1",
    name: "Luna",
    species: "Chien",
    breed: "Labrador",
    birthDate: new Date("2020-01-15"),
    photoPath: null,
    notes: null,
    createdAt: new Date(),
    _count: { events: 5, vaccines: 2 },
  },
];

function makeRequest(method: string, body?: unknown): NextRequest {
  const req = new NextRequest("http://localhost:3000/api/pets", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req;
}

describe("GET /api/pets", () => {
  beforeEach(() => {
    vi.mocked(db.pet.findMany).mockResolvedValue(mockPets as never);
  });

  it("returns pet list", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Luna");
  });
});

describe("POST /api/pets", () => {
  beforeEach(() => {
    vi.mocked(db.pet.create).mockResolvedValue({
      id: "pet_new",
      name: "Milo",
      species: "Chat",
      breed: null,
      birthDate: null,
      photoPath: null,
      notes: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("creates a pet with valid data", async () => {
    const res = await POST(
      makeRequest("POST", { name: "Milo", species: "Chat" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Milo");
  });

  it("returns 422 for missing required fields", async () => {
    const res = await POST(makeRequest("POST", { species: "Chat" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 for name too long", async () => {
    const res = await POST(
      makeRequest("POST", { name: "a".repeat(101), species: "Chien" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 for empty body", async () => {
    const req = new NextRequest("http://localhost:3000/api/pets", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});
