"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventMeta } from "@/components/use-event-meta";

function toDatetimeLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Props {
  petId: string;
  petName: string;
  eventType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickEventModal({ petId, petName, eventType, open, onOpenChange }: Props) {
  const router = useRouter();
  const t = useTranslations("quickEventModal");
  const tCommon = useTranslations("common");
  const eventMeta = useEventMeta();
  const { emoji, label } = eventMeta(eventType);
  const isOther = eventType === "OTHER";
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(new Date()));
  const [loading, setLoading] = useState(false);

  function reset() {
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
          type: eventType,
          note: note.trim() || undefined,
          occurredAt: new Date(occurredAt).toISOString(),
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
          <DialogTitle>{emoji} {label} — {petName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date/time */}
          <div className="space-y-1.5">
            <Label>{tCommon("dateTime")}</Label>
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)}
            />
          </div>

          {/* Note — textarea + required for OTHER */}
          <div className="space-y-1.5">
            <Label>
              {isOther ? t("whatHappened") : tCommon("note")}
              {!isOther && <span className="text-muted-foreground font-normal text-xs ml-1">{tCommon("optional")}</span>}
            </Label>
            <textarea
              rows={isOther ? 3 : 2}
              placeholder={isOther
                ? t("otherPlaceholder")
                : t("defaultPlaceholder")
              }
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1"
              onClick={submit}
              disabled={loading || (isOther && !note.trim())}
            >
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
