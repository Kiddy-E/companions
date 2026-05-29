import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireScope, errorResponse, ApiError } from "@/lib/auth/guard";
import { deletePhoto } from "@/lib/storage/upload";

const mealTimeSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  grams: z.number().int().positive().optional(),
});
const settingsSchema = z.object({
  litterCleanHours: z.number().int().positive().optional(),
  litterChangeHours: z.number().int().positive().optional(),
  mealGrams: z.number().int().positive().nullable().optional(),
  meals: z.array(mealTimeSchema).optional(),
}).optional();

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  species: z.string().min(1).max(50).optional(),
  breed: z.string().max(100).nullable().optional(),
  birthDate: z.string().date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  settings: settingsSchema,
}).strict();

type Params = { params: Promise<{ id: string }> };

async function getPetOrThrow(id: string) {
  const pet = await db.pet.findFirst({ where: { id, active: true } });
  if (!pet) throw new ApiError(404, "NOT_FOUND", "Pet not found");
  return pet;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "pets:read");
    const { id } = await params;

    const pet = await db.pet.findFirst({
      where: { id, active: true },
      include: {
        events: {
          orderBy: { occurredAt: "desc" },
          take: 20,
          include: { user: { select: { id: true, username: true } } },
        },
        vaccines: { orderBy: { administeredAt: "desc" } },
        _count: { select: { events: true } },
      },
    });

    if (!pet) throw new ApiError(404, "NOT_FOUND", "Pet not found");
    return Response.json(pet);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "pets:write");
    const { id } = await params;

    await getPetOrThrow(id);

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()));
    }

    const updated = await db.pet.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.species !== undefined && { species: parsed.data.species }),
        ...(parsed.data.breed !== undefined && { breed: parsed.data.breed }),
        ...(parsed.data.birthDate !== undefined && {
          birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
        }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(parsed.data.settings !== undefined && { settings: parsed.data.settings as any }),
      },
    });

    return Response.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "pets:write");
    const { id } = await params;

    const pet = await getPetOrThrow(id);

    // Soft delete + clean up photo
    await db.pet.update({ where: { id }, data: { active: false } });
    if (pet.photoPath) await deletePhoto(pet.photoPath);

    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
