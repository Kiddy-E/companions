import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";

const { mockGetAuthContext } = vi.hoisted(() => ({
  mockGetAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => {
  class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  }
  function errorResponse(err: unknown) {
    if (err instanceof ApiError)
      return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
  }
  return {
    ApiError,
    errorResponse,
    requireScope: vi.fn().mockImplementation((ctx: unknown) => ctx),
    getAuthContext: mockGetAuthContext,
  };
});

mockGetAuthContext.mockResolvedValue({
  type: "session", userId: "user_1", role: Role.ADMIN, name: "Admin",
});

const mockVaccines = [
  {
    id: "vac_1",
    petId: "pet_1",
    name: "Rage",
    administeredAt: new Date("2024-03-01"),
    dueAt: new Date("2025-03-01"),
    vet: "Dr. Martin",
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    pet: { id: "pet_1", name: "Luna", species: "Chien" },
  },
];

describe("GET /api/vaccines", () => {
  beforeEach(() => {
    vi.mocked(db.vaccine.findMany).mockResolvedValue(mockVaccines as never);
  });

  it("returns vaccine list", async () => {
    const req = new NextRequest("http://localhost:3000/api/vaccines");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Rage");
  });

  it("accepts petId filter", async () => {
    const req = new NextRequest("http://localhost:3000/api/vaccines?petId=pet_1");
    await GET(req);
    expect(db.vaccine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { petId: "pet_1" } })
    );
  });
});

describe("POST /api/vaccines", () => {
  beforeEach(() => {
    vi.mocked(db.pet.findFirst).mockResolvedValue({ id: "pet_1", active: true } as never);
    vi.mocked(db.vaccine.create).mockResolvedValue({
      ...mockVaccines[0],
      pet: { id: "pet_1", name: "Luna" },
    } as never);
  });

  it("creates vaccine with valid data", async () => {
    const req = new NextRequest("http://localhost:3000/api/vaccines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        petId: "clxxxxxxxxxxxxxxxx",
        name: "Rage",
        administeredAt: "2024-03-01T10:00:00Z",
        dueAt: "2025-03-01T10:00:00Z",
      }),
    });
    // Use a valid cuid-like ID
    vi.mocked(db.pet.findFirst).mockResolvedValue({ id: "clxxxxxxxxxxxxxxxx", active: true } as never);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("returns 422 for missing required fields", async () => {
    const req = new NextRequest("http://localhost:3000/api/vaccines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Rage" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid datetime", async () => {
    const req = new NextRequest("http://localhost:3000/api/vaccines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        petId: "clxxxxxxxxxxxxxxxx",
        name: "Rage",
        administeredAt: "not-a-date",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});
