import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireScope, errorResponse, ApiError } from "@/lib/auth/guard";
import { EventType } from "@/generated/prisma";

const updateSchema = z.object({
  occurredAt: z.string().datetime().optional(),
  durationMin: z.number().int().positive().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  type: z.nativeEnum(EventType).optional(),
}).strict();

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    const auth = requireScope(ctx, "events:write");
    const { id } = await params;

    const event = await db.event.findUnique({ where: { id } });
    if (!event) throw new ApiError(404, "NOT_FOUND", "Event not found");

    // Members can only edit their own events
    if (auth.type === "session" && event.userId !== auth.userId) {
      const isAdmin = auth.role === "ADMIN";
      if (!isAdmin) throw new ApiError(403, "FORBIDDEN", "Cannot edit another user's event");
    }

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()));
    }

    const updated = await db.event.update({
      where: { id },
      data: {
        ...(parsed.data.occurredAt && { occurredAt: new Date(parsed.data.occurredAt) }),
        ...(parsed.data.durationMin !== undefined && { durationMin: parsed.data.durationMin }),
        ...(parsed.data.note !== undefined && { note: parsed.data.note }),
        ...(parsed.data.type && { type: parsed.data.type }),
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
    const auth = requireScope(ctx, "events:write");
    const { id } = await params;

    const event = await db.event.findUnique({ where: { id } });
    if (!event) throw new ApiError(404, "NOT_FOUND", "Event not found");

    if (auth.type === "session" && event.userId !== auth.userId) {
      const isAdmin = auth.role === "ADMIN";
      if (!isAdmin) throw new ApiError(403, "FORBIDDEN", "Cannot delete another user's event");
    }

    await db.event.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
