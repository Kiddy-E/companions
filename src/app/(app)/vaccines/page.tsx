import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Syringe, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function VaccinesPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [pets, vaccines] = await Promise.all([
    db.pet.findMany({ where: { active: true }, select: { id: true, name: true, species: true } }),
    db.vaccine.findMany({
      include: { pet: { select: { id: true, name: true } } },
      orderBy: [{ dueAt: "asc" }, { administeredAt: "desc" }],
    }),
  ]);

  const overdue = vaccines.filter((v) => v.dueAt && v.dueAt < now);
  const dueSoon = vaccines.filter((v) => v.dueAt && v.dueAt >= now && v.dueAt <= in30Days);
  const upToDate = vaccines.filter((v) => !v.dueAt || v.dueAt > in30Days);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vaccins</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {vaccines.length} vaccin{vaccines.length !== 1 ? "s" : ""} enregistré{vaccines.length !== 1 ? "s" : ""}
          </p>
        </div>
        {pets.length > 0 && (
          <Button asChild size="sm">
            <Link href={`/pets/${pets[0].id}/vaccines/new`}>
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter
            </Link>
          </Button>
        )}
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <VaccineGroup
          title="En retard"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          vaccines={overdue}
          variant="overdue"
        />
      )}

      {/* Due soon */}
      {dueSoon.length > 0 && (
        <VaccineGroup
          title="À venir (30 jours)"
          icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
          vaccines={dueSoon}
          variant="soon"
        />
      )}

      {/* By pet */}
      {pets.map((pet) => {
        const petVaccines = upToDate.filter((v) => v.petId === pet.id);
        if (petVaccines.length === 0) return null;
        return (
          <Card key={pet.id}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Syringe className="h-4 w-4" />
                {pet.name}
                <Badge variant="secondary" className="text-xs">{pet.species}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/pets/${pet.id}/vaccines/new`}>
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <VaccineList vaccines={petVaccines} />
            </CardContent>
          </Card>
        );
      })}

      {vaccines.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
          <Syringe className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">Aucun vaccin enregistré</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">
            Suivez les vaccinations et recevez des rappels pour les prochains rendez-vous
          </p>
          {pets.length > 0 && (
            <Button asChild>
              <Link href={`/pets/${pets[0].id}/vaccines/new`}>
                <Plus className="h-4 w-4 mr-1.5" />
                Ajouter un vaccin
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

type VaccineWithPet = {
  id: string;
  name: string;
  administeredAt: Date;
  dueAt: Date | null;
  vet: string | null;
  note: string | null;
  pet: { id: string; name: string };
};

function VaccineGroup({
  title,
  icon,
  vaccines,
  variant,
}: {
  title: string;
  icon: React.ReactNode;
  vaccines: VaccineWithPet[];
  variant: "overdue" | "soon";
}) {
  return (
    <Card className={variant === "overdue"
      ? "border-destructive/40 bg-destructive/5"
      : "border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20"
    }>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <VaccineList vaccines={vaccines} showPet />
      </CardContent>
    </Card>
  );
}

function VaccineList({ vaccines, showPet }: { vaccines: VaccineWithPet[]; showPet?: boolean }) {
  return (
    <div className="space-y-0">
      {vaccines.map((v, i) => (
        <div key={v.id}>
          <div className="flex items-start justify-between py-2.5 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {showPet && <span className="text-muted-foreground">{v.pet.name} — </span>}
                {v.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Administré{" "}
                {new Date(v.administeredAt).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
                {v.vet ? ` · ${v.vet}` : ""}
              </p>
              {v.note && <p className="text-xs text-muted-foreground italic mt-0.5">{v.note}</p>}
            </div>
            {v.dueAt && (
              <Badge
                variant={new Date(v.dueAt) < new Date() ? "destructive" : "outline"}
                className="text-xs flex-shrink-0"
              >
                Rappel{" "}
                {new Date(v.dueAt).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </Badge>
            )}
          </div>
          {i < vaccines.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
