"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  petId: string;
  petName: string;
}

export function DeletePetButton({ petId, petName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/pets/${petId}`, { method: "DELETE" });
      router.push("/pets");
      router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Supprimer {petName} ?</span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Oui"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
          Non
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
