import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requireScope, errorResponse } from "@/lib/auth/guard";
import { EventType } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireScope(ctx, "events:read");

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const pets = await db.pet.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, species: true, breed: true, photoPath: true },
    });

    // Per-pet: last event per type + today counts — one query each
    const petSummaries = await Promise.all(
      pets.map(async (pet) => {
        // Last event per type (last WALK, MEAL, PEE, POOP, MED)
        const lastEvents = await db.event.findMany({
          where: { petId: pet.id },
          orderBy: { occurredAt: "desc" },
          distinct: ["type"],
          select: { type: true, occurredAt: true, durationMin: true, note: true },
        });

        // Today's event counts
        const todayCounts = await db.event.groupBy({
          by: ["type"],
          where: { petId: pet.id, occurredAt: { gte: todayStart } },
          _count: { type: true },
        });

        const todayCountMap: Record<string, number> = {};
        for (const c of todayCounts) {
          todayCountMap[c.type] = c._count.type;
        }

        const lastEventMap: Record<string, { occurredAt: Date; durationMin: number | null; note: string | null }> = {};
        for (const e of lastEvents) {
          lastEventMap[e.type] = { occurredAt: e.occurredAt, durationMin: e.durationMin, note: e.note };
        }

        return {
          ...pet,
          lastEvents: lastEventMap,
          todayEventCounts: todayCountMap,
          hasPhoto: !!pet.photoPath,
          photoUrl: pet.photoPath ? `/api/pets/${pet.id}/photo` : null,
        };
      })
    );

    // Vaccines: overdue + upcoming 30 days
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const vaccines = await db.vaccine.findMany({
      where: { dueAt: { lte: in30Days } },
      include: { pet: { select: { id: true, name: true } } },
      orderBy: { dueAt: "asc" },
    });

    const overdueVaccines = vaccines.filter((v) => v.dueAt && v.dueAt < now);
    const upcomingVaccines = vaccines.filter((v) => v.dueAt && v.dueAt >= now);

    return Response.json({
      generatedAt: now.toISOString(),
      pets: petSummaries,
      overdueVaccines,
      upcomingVaccines,
      stats: {
        totalPets: pets.length,
        overdueVaccineCount: overdueVaccines.length,
        upcomingVaccineCount: upcomingVaccines.length,
        todayWalks: petSummaries.reduce((s, p) => s + (p.todayEventCounts[EventType.WALK] ?? 0), 0),
        todayMeals: petSummaries.reduce((s, p) => s + (p.todayEventCounts[EventType.MEAL] ?? 0), 0),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
