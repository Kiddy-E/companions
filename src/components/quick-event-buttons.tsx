"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  petId: string;
  petName: string;
}

const QUICK_EVENTS = [
  { type: "WALK", label: "🦮 Sortie" },
  { type: "MEAL", label: "🍽️ Repas" },
  { type: "PEE", label: "💧 Pipi" },
  { type: "POOP", label: "💩 Caca" },
] as const;

export function QuickEventButtons({ petId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

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
    <div className="grid grid-cols-2 gap-1.5">
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
  );
}
