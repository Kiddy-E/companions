import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PawPrint, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickEventButtons } from "@/components/quick-event-buttons";
import { formatRelativeTime } from "@/lib/date-utils";

const EVENT_LABELS: Record<string, string> = {
  WALK:         "🦮 Sortie",
  MEAL:         "🍽️ Repas",
  PEE:          "💧 Pipi",
  POOP:         "💩 Caca",
  MED:          "💊 Soin",
  BATH:         "🛁 Bain",
  LITTER:       "🪣 Litière",
  PLAY:         "🎾 Jeu",
  GROOM:        "✂️ Toilettage",
  WATER_CHANGE: "💧 Eau",
  TRAINING:     "🏅 Dressage",
  OTHER:        "📝 Autre",
};

async function getDashboardData() {
  const [pets, upcomingVaccines] = await Promise.all([
    db.pet.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    db.vaccine.findMany({
      where: {
        dueAt: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
      include: { pet: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
  ]);

  // Last event per (petId, type)
  const petIds = pets.map(p => p.id);
  const lastEventRows = petIds.length > 0
    ? await db.event.findMany({
        where: { petId: { in: petIds } },
        orderBy: { occurredAt: "desc" },
        distinct: ["petId", "type"],
        select: { petId: true, type: true, occurredAt: true },
      })
    : [];

  // Build map petId → { type → ISO string }
  const lastEventMap = new Map<string, Record<string, string>>();
  for (const row of lastEventRows) {
    if (!lastEventMap.has(row.petId)) lastEventMap.set(row.petId, {});
    lastEventMap.get(row.petId)![row.type] = row.occurredAt.toISOString();
  }

  return { pets, upcomingVaccines, lastEventMap };
}

export default async function DashboardPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const { pets, upcomingVaccines, lastEventMap } = await getDashboardData();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {session.user.username} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {pets.length === 0
              ? "Ajoutez votre premier animal pour commencer"
              : `${pets.length} animal${pets.length > 1 ? "x" : ""} suivi${pets.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/pets/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Ajouter
          </Link>
        </Button>
      </div>

      {/* Upcoming vaccine alerts */}
      {upcomingVaccines.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              Rappels vaccins à venir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {upcomingVaccines.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-900 dark:text-amber-100">
                  <span className="font-medium">{v.pet.name}</span> — {v.name}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs border-amber-300 text-amber-800 dark:text-amber-200"
                >
                  {v.dueAt
                    ? new Date(v.dueAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No pets state */}
      {pets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
          <PawPrint className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">Aucun animal pour l&#39;instant</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">
            Ajoutez votre premier animal de compagnie pour commencer le suivi
          </p>
          <Button asChild>
            <Link href="/pets/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter un animal
            </Link>
          </Button>
        </div>
      )}

      {/* Pet cards */}
      {pets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => {
            const lastEvents = lastEventMap.get(pet.id) ?? {};
            // Most recent event for the "recap" line
            const latestType = Object.entries(lastEvents).sort(
              (a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime()
            )[0];

            return (
              <Card key={pet.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {/* Clickable photo → pet detail */}
                    <Link href={`/pets/${pet.id}`} className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                      {pet.photoPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/pets/${pet.id}/photo`}
                          alt={pet.name}
                          className="h-full w-full object-cover rounded-full"
                        />
                      ) : (
                        <PawPrint className="h-5 w-5 text-primary" />
                      )}
                    </Link>
                    <div className="min-w-0">
                      {/* Clickable name → pet detail */}
                      <Link href={`/pets/${pet.id}`} className="hover:text-primary transition-colors">
                        <CardTitle className="text-base">{pet.name}</CardTitle>
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize">
                        {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestType ? (
                    <p className="text-xs text-muted-foreground">
                      Dernière activité :{" "}
                      <span className="font-medium text-foreground">
                        {EVENT_LABELS[latestType[0]] ?? latestType[0]}
                      </span>{" "}
                      {formatRelativeTime(latestType[1])}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucune activité enregistrée</p>
                  )}
                  <QuickEventButtons
                    petId={pet.id}
                    petName={pet.name}
                    species={pet.species}
                    lastEvents={lastEvents}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
