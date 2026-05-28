import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireScope, errorResponse, ApiError } from "@/lib/auth/guard";

const createSchema = z.object({
  petId: z.string().cuid(),
  name: z.string().min(1).max(100),
  administeredAt: z.string().datetime(),
  dueAt: z.string().datetime().optional(),
  vet: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "vaccines:read");

    const petId = req.nextUrl.searchParams.get("petId") ?? undefined;

    const vaccines = await db.vaccine.findMany({
      where: { ...(petId && { petId }) },
      include: { pet: { select: { id: true, name: true, species: true } } },
      orderBy: { dueAt: "asc" },
    });

    return Response.json({ data: vaccines });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "vaccines:write");

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()));
    }

    const pet = await db.pet.findFirst({ where: { id: parsed.data.petId, active: true } });
    if (!pet) throw new ApiError(404, "NOT_FOUND", "Pet not found");

    const vaccine = await db.vaccine.create({
      data: {
        petId: parsed.data.petId,
        name: parsed.data.name,
        administeredAt: new Date(parsed.data.administeredAt),
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
        vet: parsed.data.vet,
        note: parsed.data.note,
      },
      include: { pet: { select: { id: true, name: true } } },
    });

    return Response.json(vaccine, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
