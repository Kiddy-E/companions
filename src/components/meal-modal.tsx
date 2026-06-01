"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toDatetimeLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Props {
  petId: string;
  petName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultGrams?: number;
}

export function MealModal({ petId, petName, open, onOpenChange, defaultGrams }: Props) {
  const router = useRouter();
  const t = useTranslations("mealModal");
  const tCommon = useTranslations("common");
  const [grams, setGrams] = useState<string>(defaultGrams ? String(defaultGrams) : "");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(new Date()));
  const [loading, setLoading] = useState(false);

  function reset() {
    setGrams(defaultGrams ? String(defaultGrams) : "");
    setNote("");
    setOccurredAt(toDatetimeLocal(new Date()));
  }

  async function submit() {
    setLoading(true);
    try {
      const gramsNum = grams ? Number(grams) : undefined;
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId,
          type: "MEAL",
          note: note.trim() || undefined,
          occurredAt: new Date(occurredAt).toISOString(),
          metadata: gramsNum ? { grams: gramsNum } : undefined,
        }),
      });
      reset();
      onOpenChange(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader onClose={() => onOpenChange(false)}>
          <DialogTitle>🍽️ {t("title")} — {petName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quantity */}
          <div className="space-y-1.5">
            <Label>{t("quantity")} <span className="text-muted-foreground font-normal text-xs">{tCommon("optional")}</span></Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={5000}
                placeholder={defaultGrams ? String(defaultGrams) : t("quantityPlaceholder")}
                value={grams}
                onChange={e => setGrams(e.target.value)}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">{tCommon("grams")}</span>
            </div>
          </div>

          {/* Date/time */}
          <div className="space-y-1.5">
            <Label>{tCommon("dateTime")}</Label>
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>{tCommon("note")} <span className="text-muted-foreground font-normal text-xs">{tCommon("optional")}</span></Label>
            <Input
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={submit} disabled={loading}>
              {loading ? tCommon("saving") : tCommon("save")}
            </Button>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
