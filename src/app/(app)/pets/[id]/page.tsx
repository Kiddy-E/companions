import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, PawPrint, Syringe, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuickEventButtons } from "@/components/quick-event-buttons";
import { JournalList } from "@/components/journal-list";
import { DeletePetButton } from "@/components/delete-pet-button";
import { differenceInYears, differenceInMonths, formatRelativeTime } from "@/lib/date-utils";
import { getSessionFromCookie } from "@/lib/auth/session";
import { Role } from "@/generated/prisma";
import { EVENT_LABEL_MAP, getSpeciesProfile, SPECIES_QUICK_ACTIONS } from "@/lib/species-profiles";

type Props = { params: Promise<{ id: string }> };

export default async function PetDetailPage({ params }: Props) {
  const { id } = await params;

  const [pet, session] = await Promise.all([
    db.pet.findFirst({
      where: { id, active: true },
      include: {
        events: {
          orderBy: { occurredAt: "desc" },
          take: 50,
          include: {
            user: { select: { id: true, username: true } },
            pet: { select: { id: true, name: true } },
          },
        },
        vaccines: { orderBy: { dueAt: "asc" } },
        _count: { select: { events: true } },
      },
    }),
    getSessionFromCookie(),
  ]);

  if (!pet) notFound();
  if (!session) redirect("/login");

  const now = new Date();
  const overdueVaccines = pet.vaccines.filter(v => v.dueAt && new Date(v.dueAt) < now);
  const nextVaccine = pet.vaccines.find(v => v.dueAt && new Date(v.dueAt) >= now);

  // Last event per type for this pet
  const lastEventMap: Record<string, string> = {};
  for (const ev of [...pet.events].reverse()) {
    if (!lastEventMap[ev.type]) {
      lastEventMap[ev.type] = ev.occurredAt.toISOString();
    }
  }

  // Recap items: quick action types for this species
  const profile = getSpeciesProfile(pet.species);
  const recapTypes = SPECIES_QUICK_ACTIONS[profile].slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Back */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/pets">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Animaux
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {pet.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/pets/${pet.id}/photo`} alt={pet.name} className="h-full w-full object-cover" />
          ) : (
            <PawPrint className="h-9 w-9 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{pet.name}</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
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

      {/* Récap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Récapitulatif</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recapTypes.map(type => {
              const { emoji, label } = EVENT_LABEL_MAP[type] ?? { emoji: "📝", label: type };
              const last = lastEventMap[type];
              return (
                <div key={type} className="rounded-xl bg-muted/40 px-3 py-2.5 space-y-0.5">
                  <p className="text-xs text-muted-foreground">{emoji} {label}</p>
                  <p className={`text-sm font-medium ${last ? "text-foreground" : "text-muted-foreground"}`}>
                    {last ? formatRelativeTime(last) : "Jamais"}
                  </p>
                </div>
              );
            })}
            {nextVaccine && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 space-y-0.5">
                <p className="text-xs text-amber-700 dark:text-amber-300">💉 {nextVaccine.name}</p>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {new Date(nextVaccine.dueAt!).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickEventButtons
            petId={pet.id}
            petName={pet.name}
            species={pet.species}
            lastEvents={lastEventMap}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Journal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Journal ({pet._count.events})
            </h2>
            {pet._count.events > 50 && (
              <Link href={`/journal?petId=${pet.id}`} className="text-xs text-primary hover:underline">
                Voir tout
              </Link>
            )}
          </div>
          {pet.events.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Aucun événement enregistré</p>
              </CardContent>
            </Card>
          ) : (
            <JournalList
              events={pet.events.map(e => ({
                ...e,
                occurredAt: e.occurredAt.toISOString(),
              }))}
              currentUserId={session.userId}
              isAdmin={session.user.role === Role.ADMIN}
            />
          )}
        </div>

        {/* Vaccines */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Syringe className="h-4 w-4" />
              Vaccins ({pet.vaccines.length})
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/pets/${pet.id}/vaccines/new`}>
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
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
                              {new Date(vaccine.administeredAt).toLocaleDateString("fr-FR", {
                                day: "numeric", month: "short", year: "numeric",
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
                                day: "numeric", month: "short", year: "numeric",
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
