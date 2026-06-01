"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function toDatetimeLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type LitterAction = "cleaned" | "changed" | null;

interface Props {
  petId: string;
  petName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LitterModal({ petId, petName, open, onOpenChange }: Props) {
  const router = useRouter();
  const t = useTranslations("litterModal");
  const tCommon = useTranslations("common");
  const tLitter = useTranslations("litter");
  const [hasPee, setHasPee] = useState(false);
  const [hasPoop, setHasPoop] = useState(false);
  const [action, setAction] = useState<LitterAction>(null);
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(new Date()));
  const [loading, setLoading] = useState(false);

  function reset() {
    setHasPee(false);
    setHasPoop(false);
    setAction(null);
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
          type: "LITTER",
          note: note.trim() || undefined,
          occurredAt: new Date(occurredAt).toISOString(),
          metadata: { hasPee, hasPoop, ...(action ? { action } : {}) },
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
          <DialogTitle>🪣 {t("title")} — {petName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Besoins */}
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

          {/* Action — radio-style */}
          <div className="space-y-1.5">
            <Label>{t("maintenance")}</Label>
            <div className="flex gap-2">
              {(["cleaned", "changed"] as LitterAction[]).map(opt => {
                const isSelected = action === opt;
                const config = {
                  cleaned: { emoji: "🧹", label: tLitter("cleaned"), color: "green" },
                  changed: { emoji: "♻️", label: tLitter("changed"), color: "primary" },
                }[opt as "cleaned" | "changed"];
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAction(isSelected ? null : opt)}
                    className={cn(
                      "flex-1 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                      isSelected && opt === "cleaned"
                        ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-950/40 dark:border-green-700 dark:text-green-300 scale-[1.02]"
                        : isSelected && opt === "changed"
                        ? "bg-primary/10 border-primary text-primary scale-[1.02]"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{config.emoji}</span>
                    {config.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("hint")}
            </p>
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
            <Input placeholder={t("notePlaceholder")} value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={submit} disabled={loading}>
              {loading ? tCommon("saving") : tCommon("save")}
            </Button>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>{tCommon("cancel")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
