import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireScope, errorResponse, ApiError } from "@/lib/auth/guard";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  administeredAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  vet: z.string().max(200).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
}).strict();

type Params = { params: Promise<{ id: string }> };

async function getVaccineOrThrow(id: string) {
  const v = await db.vaccine.findUnique({ where: { id } });
  if (!v) throw new ApiError(404, "NOT_FOUND", "Vaccine not found");
  return v;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "vaccines:read");
    const { id } = await params;

    const vaccine = await db.vaccine.findUnique({
      where: { id },
      include: { pet: { select: { id: true, name: true } } },
    });
    if (!vaccine) throw new ApiError(404, "NOT_FOUND", "Vaccine not found");

    return Response.json(vaccine);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "vaccines:write");
    const { id } = await params;
    await getVaccineOrThrow(id);

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()));
    }

    const updated = await db.vaccine.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.administeredAt !== undefined && {
          administeredAt: new Date(parsed.data.administeredAt),
        }),
        ...(parsed.data.dueAt !== undefined && {
          dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        }),
        ...(parsed.data.vet !== undefined && { vet: parsed.data.vet }),
        ...(parsed.data.note !== undefined && { note: parsed.data.note }),
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
    requireScope(ctx, "vaccines:write");
    const { id } = await params;
    await getVaccineOrThrow(id);

    await db.vaccine.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
