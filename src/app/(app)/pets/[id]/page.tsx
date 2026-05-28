import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, PawPrint, Syringe, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuickEventButtons } from "@/components/quick-event-buttons";
import { DeletePetButton } from "@/components/delete-pet-button";
import { differenceInYears, differenceInMonths } from "@/lib/date-utils";

type Props = { params: Promise<{ id: string }> };

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

export default async function PetDetailPage({ params }: Props) {
  const { id } = await params;

  const pet = await db.pet.findFirst({
    where: { id, active: true },
    include: {
      events: {
        orderBy: { occurredAt: "desc" },
        take: 30,
        include: { user: { select: { id: true, username: true } } },
      },
      vaccines: { orderBy: { dueAt: "asc" } },
      _count: { select: { events: true } },
    },
  });

  if (!pet) notFound();

  const now = new Date();
  const overdueVaccines = pet.vaccines.filter(
    (v) => v.dueAt && new Date(v.dueAt) < now
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/pets">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Animaux
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-4">
        {/* Photo */}
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {pet.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/pets/${pet.id}/photo`}
              alt={pet.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <PawPrint className="h-9 w-9 text-primary" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{pet.name}</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {pet.species}
            {pet.breed ? ` · ${pet.breed}` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {pet.birthDate && (
              <Badge variant="secondary" className="text-xs">
                🎂 {formatAge(pet.birthDate)}
              </Badge>
            )}
            {overdueVaccines.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                ⚠️ {overdueVaccines.length} vaccin{overdueVaccines.length > 1 ? "s" : ""} en retard
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pets/${pet.id}/edit`}>
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Modifier
            </Link>
          </Button>
          <DeletePetButton petId={pet.id} petName={pet.name} />
        </div>
      </div>

      {pet.notes && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3">
          {pet.notes}
        </p>
      )}

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickEventButtons petId={pet.id} petName={pet.name} species={pet.species} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event journal */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Journal ({pet._count.events})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pet.events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun événement enregistré
              </p>
            ) : (
              <div className="space-y-0">
                {pet.events.map((event, i) => (
                  <div key={event.id}>
                    <div className="flex items-start gap-3 py-2.5">
                      <div className="text-base leading-none mt-0.5">
                        {EVENT_LABELS[event.type]?.split(" ")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {EVENT_LABELS[event.type]?.split(" ").slice(1).join(" ")}
                          </span>
                          {event.durationMin && (
                            <Badge variant="secondary" className="text-xs">
                              {event.durationMin} min
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.occurredAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {event.user.username}
                          </span>
                        </div>
                        {event.note && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                    {i < pet.events.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vaccines */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Syringe className="h-4 w-4" />
              Vaccins ({pet.vaccines.length})
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/pets/${pet.id}/vaccines/new`}>
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pet.vaccines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun vaccin enregistré
              </p>
            ) : (
              <div className="space-y-0">
                {pet.vaccines.map((vaccine, i) => {
                  const overdue = vaccine.dueAt && new Date(vaccine.dueAt) < now;
                  const dueSoon =
                    vaccine.dueAt &&
                    !overdue &&
                    new Date(vaccine.dueAt) < new Date(now.getTime() + 30 * 86400000);
                  return (
                    <div key={vaccine.id}>
                      <div className="flex items-start justify-between py-2.5 gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{vaccine.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Administré le{" "}
                            {new Date(vaccine.administeredAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            {vaccine.vet ? ` · ${vaccine.vet}` : ""}
                          </p>
                        </div>
                        {vaccine.dueAt && (
                          <Badge
                            variant={overdue ? "destructive" : dueSoon ? "outline" : "secondary"}
                            className="text-xs flex-shrink-0"
                          >
                            Rappel{" "}
                            {new Date(vaccine.dueAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </Badge>
                        )}
                      </div>
                      {i < pet.vaccines.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatAge(birthDate: Date): string {
  const now = new Date();
  const years = differenceInYears(now, new Date(birthDate));
  if (years >= 1) return `${years} an${years > 1 ? "s" : ""}`;
  const months = differenceInMonths(now, new Date(birthDate));
  if (months >= 1) return `${months} mois`;
  return "< 1 mois";
}
