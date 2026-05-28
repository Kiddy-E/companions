import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";

const { mockGetAuthContext } = vi.hoisted(() => ({ mockGetAuthContext: vi.fn() }));

vi.mock("@/lib/auth/guard", () => {
  function errorResponse(err: unknown) {
    return Response.json({ error: { message: String(err) } }, { status: 500 });
  }
  return {
    requireScope: vi.fn().mockImplementation((ctx: unknown) => ctx),
    errorResponse,
    getAuthContext: mockGetAuthContext,
  };
});

mockGetAuthContext.mockResolvedValue({
  type: "session", userId: "u1", role: Role.ADMIN, name: "Admin",
});

const mockPet = { id: "pet_1", name: "Luna", species: "Chien", breed: null, photoPath: null };

describe("GET /api/summary", () => {
  beforeEach(() => {
    vi.mocked(db.pet.findMany).mockResolvedValue([mockPet] as never);
    vi.mocked(db.event.findMany).mockResolvedValue([]);
    vi.mocked(db.event.groupBy).mockResolvedValue([]);
    vi.mocked(db.vaccine.findMany).mockResolvedValue([]);
  });

  it("returns summary with pets and stats", async () => {
    const req = new NextRequest("http://localhost:3000/api/summary");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pets).toHaveLength(1);
    expect(body.pets[0].name).toBe("Luna");
    expect(body.stats.totalPets).toBe(1);
    expect(body.overdueVaccines).toEqual([]);
    expect(body.upcomingVaccines).toEqual([]);
    expect(body.generatedAt).toBeDefined();
  });

  it("includes photoUrl when photoPath exists", async () => {
    vi.mocked(db.pet.findMany).mockResolvedValue([
      { ...mockPet, photoPath: "abc.jpg" },
    ] as never);
    const req = new NextRequest("http://localhost:3000/api/summary");
    const res = await GET(req);
    const body = await res.json();
    expect(body.pets[0].photoUrl).toBe("/api/pets/pet_1/photo");
    expect(body.pets[0].hasPhoto).toBe(true);
  });

  it("separates overdue vs upcoming vaccines", async () => {
    const pastDate = new Date(Date.now() - 86400000); // yesterday
    const futureDate = new Date(Date.now() + 7 * 86400000); // next week
    vi.mocked(db.vaccine.findMany).mockResolvedValue([
      { id: "v1", name: "Rage", dueAt: pastDate, pet: { id: "pet_1", name: "Luna" } },
      { id: "v2", name: "CHPL", dueAt: futureDate, pet: { id: "pet_1", name: "Luna" } },
    ] as never);

    const req = new NextRequest("http://localhost:3000/api/summary");
    const res = await GET(req);
    const body = await res.json();
    expect(body.overdueVaccines).toHaveLength(1);
    expect(body.overdueVaccines[0].name).toBe("Rage");
    expect(body.upcomingVaccines).toHaveLength(1);
    expect(body.upcomingVaccines[0].name).toBe("CHPL");
    expect(body.stats.overdueVaccineCount).toBe(1);
  });
});
