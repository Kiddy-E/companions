import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireScope, errorResponse } from "@/lib/auth/guard";
import { EventType } from "@/generated/prisma";

const createSchema = z.object({
  petId: z.string().cuid(),
  type: z.nativeEnum(EventType),
  occurredAt: z.string().datetime().optional(),
  durationMin: z.number().int().positive().optional(),
  note: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listSchema = z.object({
  petId: z.string().cuid().optional(),
  type: z.nativeEnum(EventType).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "events:read");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = listSchema.safeParse(params);
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const { petId, type, from, to, limit, cursor } = parsed.data;

    const events = await db.event.findMany({
      where: {
        ...(petId && { petId }),
        ...(type && { type }),
        ...(from || to
          ? { occurredAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } }
          : {}),
        ...(cursor && { id: { lt: cursor } }),
      },
      include: {
        pet: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: limit + 1,
    });

    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, limit) : events;

    return Response.json({
      data: items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const auth = requireScope(ctx, "events:write");

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const pet = await db.pet.findFirst({
      where: { id: parsed.data.petId, active: true },
    });
    if (!pet) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Pet not found" } },
        { status: 404 }
      );
    }

    const event = await db.event.create({
      data: {
        petId: parsed.data.petId,
        userId: auth.userId,
        type: parsed.data.type,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : new Date(),
        durationMin: parsed.data.durationMin,
        note: parsed.data.note,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: parsed.data.metadata as any,
      },
      include: {
        pet: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return Response.json(event, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
