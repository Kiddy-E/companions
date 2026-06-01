import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { PawPrint, Plus, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickEventButtons } from "@/components/quick-event-buttons";
import { DashboardTimeline } from "@/components/dashboard-timeline";
import { buildLastEventMap } from "@/lib/event-utils";
import { getSpeciesProfile } from "@/lib/species-profiles";
import { getEventMeta } from "@/lib/event-meta-server";
import { checkMealWarnings, formatMealWarnings } from "@/lib/meal-warnings";

interface PetSettings {
  litterCleanHours?: number;
  litterChangeHours?: number;
  mealGrams?: number;
  meals?: { time: string; grams?: number }[];
}

// Status icons shown per species in the "today" row
const SPECIES_STATUS_TYPES: Record<string, string[]> = {
  dog:     ["WALK", "MEAL", "PEE", "POOP"],
  cat:     ["MEAL", "LITTER"],
  rabbit:  ["MEAL", "LITTER"],
  bird:    ["MEAL", "WATER_CHANGE"],
  fish:    ["MEAL", "WATER_CHANGE"],
  reptile: ["MEAL"],
  other:   ["MEAL"],
};

async function getDashboardData() {
  const t = await getTranslations("dashboard");
  const tMeal = await getTranslations("mealWarnings");
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const pets = await db.pet.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const speciesOrder = ["dog", "cat", "rabbit", "bird", "fish", "reptile", "other"];
  pets.sort(
    (a, b) =>
      speciesOrder.indexOf(getSpeciesProfile(a.species)) -
      speciesOrder.indexOf(getSpeciesProfile(b.species))
  );

  const petIds = pets.map((p) => p.id);

  const [todayEvents, recentEvents] = await Promise.all([
    petIds.length > 0
      ? db.event.findMany({
          where: { petId: { in: petIds }, occurredAt: { gte: todayStart } },
          orderBy: { occurredAt: "desc" },
          include: {
            user: { select: { id: true, username: true } },
            pet: { select: { id: true, name: true, species: true } },
          },
        })
      : Promise.resolve([]),
    petIds.length > 0
      ? db.event.findMany({
          where: { petId: { in: petIds } },
          orderBy: { occurredAt: "desc" },
          select: { petId: true, type: true, occurredAt: true, metadata: true },
          take: 500,
        })
      : Promise.resolve([]),
  ]);

  const lastEventMap = buildLastEventMap(recentEvents);

  // Today's event counts per (petId, type) — extract pee/poop from walk/litter metadata
  const todayCountMap = new Map<string, Map<string, number>>();
  for (const e of todayEvents) {
    if (!todayCountMap.has(e.petId)) todayCountMap.set(e.petId, new Map());
    const m = todayCountMap.get(e.petId)!;
    m.set(e.type, (m.get(e.type) ?? 0) + 1);
    const meta = e.metadata as { hasPee?: boolean; hasPoop?: boolean } | null;
    if (meta?.hasPee) m.set("PEE", (m.get("PEE") ?? 0) + 1);
    if (meta?.hasPoop) m.set("POOP", (m.get("POOP") ?? 0) + 1);
  }

  // Warnings per pet
  type Warning = { petId: string; petName: string; message: string; level: "urgent" | "warn" };
  const warnings: Warning[] = [];

  for (const pet of pets) {
    const settings = (pet.settings as PetSettings) ?? {};
    const petLastEvents = lastEventMap.get(pet.id) ?? {};

    // Meal warning — check each slot vs grams given in that window
    if (settings.meals?.length) {
      const petMealsToday = todayEvents.filter(e => e.petId === pet.id && e.type === "MEAL");
      const mealMsg = formatMealWarnings(
        checkMealWarnings(settings.meals, settings.mealGrams, petMealsToday, now),
        tMeal
      );
      if (mealMsg)
        warnings.push({ petId: pet.id, petName: pet.name, message: mealMsg, level: "urgent" });
    }

    // Litter clean warning
    if (settings.litterCleanHours) {
      const recentLitter = recentEvents
        .filter((e) => e.petId === pet.id && e.type === "LITTER")
        .find((e) => {
          const meta = e.metadata as { action?: string; cleaned?: boolean } | null;
          return meta?.action === "cleaned" || meta?.action === "changed" || meta?.cleaned === true;
        });
      if (!recentLitter) {
        warnings.push({ petId: pet.id, petName: pet.name, message: t("litterNeverCleaned"), level: "warn" });
      } else {
        const h = (now.getTime() - recentLitter.occurredAt.getTime()) / 3600000;
        if (h > settings.litterCleanHours)
          warnings.push({ petId: pet.id, petName: pet.name, message: t("litterToClean", { hours: Math.floor(h) }), level: "warn" });
      }
    }

    // Litter change warning
    if (settings.litterChangeHours) {
      const lastChange = recentEvents
        .filter((e) => e.petId === pet.id && e.type === "LITTER")
        .find((e) => (e.metadata as { action?: string } | null)?.action === "changed");
      if (!lastChange) {
        warnings.push({ petId: pet.id, petName: pet.name, message: t("litterNeverChanged"), level: "warn" });
      } else {
        const h = (now.getTime() - lastChange.occurredAt.getTime()) / 3600000;
        if (h > settings.litterChangeHours) {
          const days = Math.round(settings.litterChangeHours / 24);
          warnings.push({ petId: pet.id, petName: pet.name, message: t("litterToChange", { days: Math.floor(h / 24), max: days }), level: "warn" });
        }
      }
    }
  }

  return { pets, todayEvents, todayCountMap, lastEventMap, warnings };
}

export default async function DashboardPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const { pets, todayEvents, todayCountMap, lastEventMap, warnings } =
    await getDashboardData();

  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const eventMeta = await getEventMeta();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t("greetingMorning") : hour < 18 ? t("greetingAfternoon") : t("greetingEvening");
  const dateLabel = now.toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long",
  });

  const urgentWarnings = warnings.filter((w) => w.level === "urgent");
  const softWarnings = warnings.filter((w) => w.level === "warn");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {session.user.username} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5 capitalize">{dateLabel}</p>
        </div>
        {pets.length > 0 && (
          <Button asChild size="sm" className="flex-shrink-0">
            <Link href="/pets/new">
              <Plus className="h-4 w-4 mr-1.5" />
              {t("add")}
            </Link>
          </Button>
        )}
      </div>

      {/* Urgent alerts */}
      {urgentWarnings.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {t("alerts")}
          </p>
          {urgentWarnings.map((w, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="font-medium">{w.petName}</span>
              <span className="text-muted-foreground text-xs">{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Soft warnings */}
      {softWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {t("todo")}
          </p>
          {softWarnings.map((w, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="font-medium">{w.petName}</span>
              <span className="text-muted-foreground text-xs">{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* No pets */}
      {pets.length === 0 && (
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
      )}

      {/* Per-animal status + quick actions */}
      {pets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("today")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet) => {
              const profile = getSpeciesProfile(pet.species);
              const statusTypes = SPECIES_STATUS_TYPES[profile] ?? ["MEAL"];
              const todayCounts = todayCountMap.get(pet.id) ?? new Map();
              const lastEvents = lastEventMap.get(pet.id) ?? {};
              const settings = (pet.settings as PetSettings) ?? {};

              return (
                <Card key={pet.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Animal header */}
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/pets/${pet.id}`}
                        className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                      >
                        {pet.photoPath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/pets/${pet.id}/photo`}
                            alt={pet.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <PawPrint className="h-5 w-5 text-primary" />
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/pets/${pet.id}`} className="font-semibold text-base hover:text-primary transition-colors">
                          {pet.name}
                        </Link>
                        <p className="text-sm text-muted-foreground capitalize">
                          {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
                        </p>
                      </div>
                      <Link href={`/pets/${pet.id}`} className="text-muted-foreground hover:text-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>

                    {/* Today status badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {statusTypes.map((type) => {
                        const count = todayCounts.get(type) ?? 0;
                        const { emoji, label } = eventMeta(type);
                        const done = count > 0;
                        return (
                          <Badge
                            key={type}
                            variant="outline"
                            className={`text-xs gap-1 ${
                              done
                                ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800"
                                : "border-muted text-muted-foreground"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{done ? `${label}${count > 1 ? ` ×${count}` : ""}` : label}</span>
                            {done && <span className="ml-0.5">✓</span>}
                          </Badge>
                        );
                      })}
                    </div>

                    {/* Quick actions */}
                    <QuickEventButtons
                      petId={pet.id}
                      petName={pet.name}
                      species={pet.species}
                      lastEvents={lastEvents}
                      defaultMealGrams={settings.mealGrams}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's timeline */}
      {todayEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("todayActivity")}
          </h2>
          <DashboardTimeline
            events={todayEvents.map(e => ({ ...e, occurredAt: e.occurredAt.toISOString() }))}
            currentUserId={session.userId}
            isAdmin={session.user.role === "ADMIN"}
          />
        </div>
      )}
    </div>
  );
}
