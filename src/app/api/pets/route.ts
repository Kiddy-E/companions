import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireScope, errorResponse, ApiError } from "@/lib/auth/guard";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.string().min(1).max(50),
  breed: z.string().max(100).optional(),
  birthDate: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "pets:read");

    const pets = await db.pet.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        species: true,
        breed: true,
        birthDate: true,
        photoPath: true,
        notes: true,
        createdAt: true,
        _count: { select: { events: true, vaccines: true } },
      },
    });

    return Response.json({ data: pets });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "pets:write");

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()));
    }

    const pet = await db.pet.create({
      data: {
        name: parsed.data.name,
        species: parsed.data.species,
        breed: parsed.data.breed,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : undefined,
        notes: parsed.data.notes,
      },
    });

    return Response.json(pet, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
