import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PawPrint, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickEventButtons } from "@/components/quick-event-buttons";

async function getDashboardData(userId: string) {
  const [pets, upcomingVaccines] = await Promise.all([
    db.pet.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        events: {
          orderBy: { occurredAt: "desc" },
          take: 1,
        },
      },
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

  return { pets, upcomingVaccines };
}

export default async function DashboardPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const { pets, upcomingVaccines } = await getDashboardData(session.userId);

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
            const lastEvent = pet.events[0];
            return (
              <Card key={pet.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{pet.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">
                        {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lastEvent ? (
                    <p className="text-xs text-muted-foreground">
                      Dernière activité :{" "}
                      <span className="font-medium text-foreground">
                        {EVENT_LABELS[lastEvent.type]}
                      </span>{" "}
                      {formatRelativeTime(lastEvent.occurredAt)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucune activité enregistrée</p>
                  )}
                  <QuickEventButtons petId={pet.id} petName={pet.name} species={pet.species} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

function formatRelativeTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}
