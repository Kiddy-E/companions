import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Calendar } from "lucide-react";
import { JournalFilters } from "@/components/journal-filters";
import { JournalList } from "@/components/journal-list";
import { EventType, Role } from "@/generated/prisma";

type SearchParams = { petId?: string; type?: string; from?: string; to?: string };

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const t = await getTranslations("journal");
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
      user: { select: { id: true, username: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {events.length === 1 ? t("countOne", { count: events.length }) : t("countOther", { count: events.length })}
          {events.length === 100 ? t("maxShown") : ""}
        </p>
      </div>

      <JournalFilters pets={pets} currentFilters={filters} />

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">{t("noneTitle")}</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {t("noneDesc")}
          </p>
        </div>
      ) : (
        <JournalList
          events={events.map(e => ({
            ...e,
            occurredAt: e.occurredAt.toISOString(),
          }))}
          currentUserId={session.userId}
          isAdmin={session.user.role === Role.ADMIN}
        />
      )}
    </div>
  );
}
