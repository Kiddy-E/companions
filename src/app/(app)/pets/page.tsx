import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickEventButtons } from "@/components/quick-event-buttons";
import { buildLastEventMap } from "@/lib/event-utils";
import { formatRelativeTime, differenceInYears, differenceInMonths } from "@/lib/date-utils";
import { EVENT_LABEL_MAP } from "@/lib/species-profiles";

export default async function PetsPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const pets = await db.pet.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const petIds = pets.map(p => p.id);
  const lastEventRows = petIds.length > 0
    ? await db.event.findMany({
        where: { petId: { in: petIds } },
        orderBy: { occurredAt: "desc" },
        select: { petId: true, type: true, occurredAt: true, metadata: true },
        take: 500,
      })
    : [];

  const lastEventMap = buildLastEventMap(lastEventRows);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Animaux</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {pets.length === 0 ? "Aucun animal" : `${pets.length} animal${pets.length > 1 ? "x" : ""}`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/pets/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Ajouter
          </Link>
        </Button>
      </div>

      {pets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
          <PawPrint className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">Aucun animal pour l&#39;instant</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">
            Commencez par ajouter votre premier animal
          </p>
          <Button asChild>
            <Link href="/pets/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter un animal
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => {
            const lastEvents = lastEventMap.get(pet.id) ?? {};
            const latestEntry = Object.entries(lastEvents).sort(
              (a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime()
            )[0];
            const age = pet.birthDate ? formatAge(pet.birthDate) : null;

            return (
              <Card key={pet.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar with age badge */}
                    <Link href={`/pets/${pet.id}`} className="relative flex-shrink-0 h-12 w-12">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {pet.photoPath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/pets/${pet.id}/photo`} alt={pet.name} className="h-full w-full object-cover" />
                        ) : (
                          <PawPrint className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      {age && (
                        <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none whitespace-nowrap">
                          {age}
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0">
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
                  {latestEntry ? (
                    <p className="text-xs text-muted-foreground">
                      Dernière activité :{" "}
                      <span className="font-medium text-foreground">
                        {EVENT_LABEL_MAP[latestEntry[0]]?.emoji}{" "}{EVENT_LABEL_MAP[latestEntry[0]]?.label ?? latestEntry[0]}
                      </span>{" "}
                      {formatRelativeTime(latestEntry[1])}
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

function formatAge(birthDate: Date): string {
  const now = new Date();
  const years = differenceInYears(now, new Date(birthDate));
  if (years >= 1) return `${years}a`;
  const months = differenceInMonths(now, new Date(birthDate));
  if (months >= 1) return `${months}m`;
  return "<1m";
}
