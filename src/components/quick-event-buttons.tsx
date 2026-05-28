"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WalkModal } from "@/components/walk-modal";

interface Props {
  petId: string;
  petName: string;
}

const QUICK_EVENTS = [
  { type: "MEAL", label: "🍽️ Repas" },
  { type: "PEE", label: "💧 Pipi" },
  { type: "POOP", label: "💩 Caca" },
  { type: "BATH", label: "🛁 Bain" },
] as const;

export function QuickEventButtons({ petId, petName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [walkOpen, setWalkOpen] = useState(false);

  async function logEvent(type: string) {
    setLoading(type);
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, type }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {/* Walk opens modal */}
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 px-2 justify-start col-span-2"
          onClick={() => setWalkOpen(true)}
        >
          🦮 Sortie
        </Button>
        {QUICK_EVENTS.map(({ type, label }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="text-xs h-8 px-2 justify-start"
            disabled={loading === type}
            onClick={() => logEvent(type)}
          >
            {loading === type ? "..." : label}
          </Button>
        ))}
      </div>

      <WalkModal
        petId={petId}
        petName={petName}
        open={walkOpen}
        onOpenChange={setWalkOpen}
      />
    </>
  );
}
