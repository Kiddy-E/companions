import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Plus, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickEventButtons } from "@/components/quick-event-buttons";
import { buildLastEventMap } from "@/lib/event-utils";
import { differenceInYears, differenceInMonths } from "@/lib/date-utils";
import { RelativeTime } from "@/components/relative-time";
import { getSpeciesProfile } from "@/lib/species-profiles";
import { getEventMeta } from "@/lib/event-meta-server";

export default async function PetsPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const t = await getTranslations("pets");
  const eventMeta = await getEventMeta();

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

  const speciesOrder = ["dog", "cat", "rabbit", "bird", "fish", "reptile", "other"];
  pets.sort((a, b) => speciesOrder.indexOf(getSpeciesProfile(a.species)) - speciesOrder.indexOf(getSpeciesProfile(b.species)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {pets.length === 0 ? t("none") : pets.length > 1 ? t("countOther", { count: pets.length }) : t("countOne", { count: pets.length })}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/pets/new">
            <Plus className="h-4 w-4 mr-1.5" />
            {t("add")}
          </Link>
        </Button>
      </div>

      {pets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
          <PawPrint className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">{t("noPetsTitle")}</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">
            {t("noPetsDesc")}
          </p>
          <Button asChild>
            <Link href="/pets/new">
              <Plus className="h-4 w-4 mr-1.5" />
              {t("addPet")}
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
                    <Link href={`/pets/${pet.id}`} className="relative flex-shrink-0 h-14 w-14">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
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
                        <CardTitle className="text-lg">{pet.name}</CardTitle>
                      </Link>
                      <p className="text-sm text-muted-foreground capitalize">
                        {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestEntry ? (
                    <p className="text-xs text-muted-foreground">
                      {t("lastActivity")}{" "}
                      <span className="font-medium text-foreground">
                        {eventMeta(latestEntry[0]).emoji}{" "}{eventMeta(latestEntry[0]).label}
                      </span>{" "}
                      <RelativeTime date={latestEntry[1]} />
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("noActivity")}</p>
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
