"use client";

import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";

const EVENT_TYPES = [
  { value: "", label: "Tous" },
  { value: "WALK", label: "🦮 Sortie" },
  { value: "MEAL", label: "🍽️ Repas" },
  { value: "PEE", label: "💧 Pipi" },
  { value: "POOP", label: "💩 Caca" },
  { value: "MED", label: "💊 Soin" },
  { value: "BATH", label: "🛁 Bain" },
  { value: "OTHER", label: "📝 Autre" },
];

interface Props {
  pets: { id: string; name: string }[];
  currentFilters: { petId?: string; type?: string; from?: string; to?: string };
}

export function JournalFilters({ pets, currentFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();

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
        <option value="">Tous les animaux</option>
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
        {EVENT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Date range */}
      <Input
        type="date"
        value={currentFilters.from ?? ""}
        onChange={(e) => update("from", e.target.value)}
        className="h-9 w-36 text-sm"
        placeholder="Depuis"
      />
      <Input
        type="date"
        value={currentFilters.to ?? ""}
        onChange={(e) => update("to", e.target.value)}
        className="h-9 w-36 text-sm"
        placeholder="Jusqu'au"
      />
    </div>
  );
}
