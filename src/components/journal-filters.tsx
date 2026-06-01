"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { EVENT_KEYS, EVENT_EMOJI } from "@/lib/event-labels";

interface Props {
  pets: { id: string; name: string }[];
  currentFilters: { petId?: string; type?: string; from?: string; to?: string };
}

export function JournalFilters({ pets, currentFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("journal");
  const tEvents = useTranslations("events");

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    const current = { ...currentFilters, [key]: value };
    for (const [k, v] of Object.entries(current)) {
      if (v) params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Pet filter */}
      <select
        value={currentFilters.petId ?? ""}
        onChange={(e) => update("petId", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">{t("allPets")}</option>
        {pets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Type filter */}
      <select
        value={currentFilters.type ?? ""}
        onChange={(e) => update("type", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">{t("all")}</option>
        {EVENT_KEYS.map((key) => (
          <option key={key} value={key}>{EVENT_EMOJI[key]} {tEvents(key)}</option>
        ))}
      </select>

      {/* Date range */}
      <Input
        type="date"
        value={currentFilters.from ?? ""}
        onChange={(e) => update("from", e.target.value)}
        className="h-9 w-36 text-sm"
        placeholder={t("from")}
      />
      <Input
        type="date"
        value={currentFilters.to ?? ""}
        onChange={(e) => update("to", e.target.value)}
        className="h-9 w-36 text-sm"
        placeholder={t("to")}
      />
    </div>
  );
}
