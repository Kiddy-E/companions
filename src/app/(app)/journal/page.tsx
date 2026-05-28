import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JournalFilters } from "@/components/journal-filters";
import { EventType } from "@/generated/prisma";

const EVENT_LABELS: Record<string, { emoji: string; label: string }> = {
  WALK: { emoji: "🦮", label: "Sortie" },
  MEAL: { emoji: "🍽️", label: "Repas" },
  PEE:  { emoji: "💧", label: "Pipi" },
  POOP: { emoji: "💩", label: "Caca" },
  MED:  { emoji: "💊", label: "Soin" },
  OTHER: { emoji: "📝", label: "Autre" },
};

type SearchParams = { petId?: string; type?: string; from?: string; to?: string };

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const filters = await searchParams;

  const pets = await db.pet.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const events = await db.event.findMany({
    where: {
      ...(filters.petId && { petId: filters.petId }),
      ...(filters.type && { type: filters.type as EventType }),
      ...(filters.from && { occurredAt: { gte: new Date(filters.from) } }),
      ...(filters.to && { occurredAt: { lte: new Date(filters.to + "T23:59:59Z") } }),
    },
    include: {
      pet: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  // Group by day
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const day = new Date(event.occurredAt).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(event);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {events.length} événement{events.length !== 1 ? "s" : ""}
          {events.length === 100 ? " (100 max affichés)" : ""}
        </p>
      </div>

      <JournalFilters pets={pets} currentFilters={filters} />

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">Aucun événement</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Utilisez les boutons rapides sur le tableau de bord pour enregistrer des activités
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([day, dayEvents]) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
                  {day}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {dayEvents.map((event, i) => {
                    const { emoji, label } = EVENT_LABELS[event.type] ?? { emoji: "📝", label: event.type };
                    return (
                      <div key={event.id}>
                        <div className="flex items-start gap-3 py-2.5">
                          <span className="text-base leading-none mt-0.5">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{label}</span>
                              <Badge variant="outline" className="text-xs">
                                {event.pet.name}
                              </Badge>
                              {event.durationMin && (
                                <Badge variant="secondary" className="text-xs">
                                  {event.durationMin} min
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.occurredAt).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                              <span className="text-xs text-muted-foreground">· {event.user.name}</span>
                            </div>
                            {event.note && (
                              <p className="text-xs text-muted-foreground italic mt-0.5">{event.note}</p>
                            )}
                          </div>
                        </div>
                        {i < dayEvents.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
