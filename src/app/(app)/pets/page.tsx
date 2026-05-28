import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { differenceInYears, differenceInMonths } from "@/lib/date-utils";

export default async function PetsPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const pets = await db.pet.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { events: true, vaccines: true } },
      events: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
  });

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
            Commencez par ajouter votre premier animal de compagnie
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
          {pets.map((pet) => (
            <Link key={pet.id} href={`/pets/${pet.id}`}>
              <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {pet.photoPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/pets/${pet.id}/photo`}
                          alt={pet.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <PawPrint className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{pet.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">
                        {pet.species}
                        {pet.breed ? ` · ${pet.breed}` : ""}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {pet.birthDate && (
                      <Badge variant="secondary" className="text-xs">
                        🎂 {formatAge(pet.birthDate)}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {pet._count.events} événement{pet._count.events !== 1 ? "s" : ""}
                    </Badge>
                    {pet._count.vaccines > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        💉 {pet._count.vaccines} vaccin{pet._count.vaccines !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  {pet.events[0] && (
                    <p className="text-xs text-muted-foreground">
                      Dernière activité{" "}
                      {new Date(pet.events[0].occurredAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAge(birthDate: Date): string {
  const years = differenceInYears(new Date(), new Date(birthDate));
  if (years >= 1) return `${years} an${years > 1 ? "s" : ""}`;
  const months = differenceInMonths(new Date(), new Date(birthDate));
  if (months >= 1) return `${months} mois`;
  return "< 1 mois";
}
