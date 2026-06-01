"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EXERTION = [
  { value: 0, key: "rest", emoji: "🛋️" },
  { value: 1, key: "stroll", emoji: "🚶" },
  { value: 2, key: "active", emoji: "🏃" },
  { value: 3, key: "intense", emoji: "🔥" },
] as const;

function toDatetimeLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Props {
  petId: string;
  petName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalkModal({ petId, petName, open, onOpenChange }: Props) {
  const router = useRouter();
  const t = useTranslations("walkModal");
  const tCommon = useTranslations("common");
  const tExertion = useTranslations("exertion");
  const [duration, setDuration] = useState(15);
  const [hasPee, setHasPee] = useState(false);
  const [hasPoop, setHasPoop] = useState(false);
  const [exertion, setExertion] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(new Date()));
  const [loading, setLoading] = useState(false);

  function reset() {
    setDuration(15);
    setHasPee(false);
    setHasPoop(false);
    setExertion(null);
    setNote("");
    setOccurredAt(toDatetimeLocal(new Date()));
  }

  async function submit() {
    setLoading(true);
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId,
          type: "WALK",
          durationMin: duration > 0 ? duration : undefined,
          note: note.trim() || undefined,
          occurredAt: new Date(occurredAt).toISOString(),
          metadata: { hasPee, hasPoop, ...(exertion !== null ? { exertion } : {}) },
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
          <DialogTitle>🦮 {t("title")} — {petName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Duration */}
          <div className="space-y-1.5">
            <Label>{t("duration")}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={600}
                value={duration}
                onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">{tCommon("minutes")}</span>
            </div>
          </div>

          {/* Needs */}
          <div className="space-y-1.5">
            <Label>{t("needs")}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHasPee(!hasPee)}
                className={cn(
                  "flex-1 py-3 rounded-xl border text-sm font-medium transition-all",
                  hasPee
                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300 scale-[1.02]"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                💧 {t("pee")}
              </button>
              <button
                type="button"
                onClick={() => setHasPoop(!hasPoop)}
                className={cn(
                  "flex-1 py-3 rounded-xl border text-sm font-medium transition-all",
                  hasPoop
                    ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300 scale-[1.02]"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                💩 {t("poop")}
              </button>
            </div>
          </div>

          {/* Exertion gauge */}
          <div className="space-y-1.5">
            <Label>{t("exertion")}</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {EXERTION.map(({ value, key, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setExertion(exertion === value ? null : value)}
                  className={cn(
                    "flex flex-col items-center py-2.5 rounded-xl border text-xs font-medium transition-all gap-1",
                    exertion === value
                      ? "bg-primary/10 border-primary text-primary scale-[1.02]"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  {tExertion(key)}
                </button>
              ))}
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
              {loading ? tCommon("saving") : t("submit")}
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
