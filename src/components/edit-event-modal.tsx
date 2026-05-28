"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EVENT_TYPE_OPTIONS = [
  { value: "WALK", label: "🦮 Sortie" },
  { value: "MEAL", label: "🍽️ Repas" },
  { value: "LITTER", label: "🪣 Litière" },
  { value: "PEE", label: "💧 Pipi" },
  { value: "POOP", label: "💩 Caca" },
  { value: "PLAY", label: "🎾 Jeu" },
  { value: "GROOM", label: "✂️ Toilettage" },
  { value: "TRAINING", label: "🏅 Dressage" },
  { value: "WATER_CHANGE", label: "💧 Eau" },
  { value: "MED", label: "💊 Soin" },
  { value: "BATH", label: "🛁 Bain" },
  { value: "OTHER", label: "📝 Autre" },
] as const;

const EXERTION = [
  { value: 0, label: "Repos", emoji: "🛋️" },
  { value: 1, label: "Balade", emoji: "🚶" },
  { value: 2, label: "Actif", emoji: "🏃" },
  { value: 3, label: "Intense", emoji: "🔥" },
] as const;

interface EventMeta {
  hasPee?: boolean;
  hasPoop?: boolean;
  exertion?: number;
  action?: "cleaned" | "changed";
  cleaned?: boolean; // legacy
}

type LitterAction = "cleaned" | "changed";

export interface EventRecord {
  id: string;
  type: string;
  occurredAt: string | Date;
  durationMin?: number | null;
  note?: string | null;
  metadata?: unknown;
  pet: { id: string; name: string };
  user: { id: string; username: string };
}

function toDatetimeLocal(d: string | Date) {
  const date = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

interface Props {
  event: EventRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: EventRecord) => void;
  onDelete: () => void;
}

export function EditEventModal({ event, open, onOpenChange, onSave, onDelete }: Props) {
  const meta = (event.metadata as EventMeta) ?? {};

  const [type, setType] = useState(event.type);
  const [duration, setDuration] = useState(event.durationMin ?? 15);
  const [hasPee, setHasPee] = useState(meta.hasPee ?? false);
  const [hasPoop, setHasPoop] = useState(meta.hasPoop ?? false);
  const [exertion, setExertion] = useState<number | null>(meta.exertion ?? null);
  const [litterAction, setLitterAction] = useState<LitterAction | null>(
    meta.action ?? (meta.cleaned ? "cleaned" : null)
  );
  const [note, setNote] = useState(event.note ?? "");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(event.occurredAt));
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const buildMeta = () => {
        if (type === "WALK") return { hasPee, hasPoop, ...(exertion !== null ? { exertion } : {}) };
        if (type === "LITTER") return { hasPee, hasPoop, ...(litterAction ? { action: litterAction } : {}) };
        return null;
      };

      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          occurredAt: new Date(occurredAt).toISOString(),
          durationMin: type === "WALK" && duration > 0 ? duration : null,
          note: note.trim() || null,
          metadata: buildMeta(),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onSave(updated);
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      onDelete();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  const ToggleButton = ({ active, onClick, children, color }: {
    active: boolean; onClick: () => void; children: React.ReactNode;
    color?: "blue" | "amber" | "green";
  }) => {
    const colors = {
      blue:  "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300",
      amber: "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300",
      green: "bg-green-50 border-green-300 text-green-700 dark:bg-green-950/40 dark:border-green-700 dark:text-green-300",
    };
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
          active ? (colors[color ?? "blue"]) : "border-border text-muted-foreground hover:bg-muted"
        )}
      >
        {children}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) setConfirmDelete(false); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader onClose={() => { setConfirmDelete(false); onOpenChange(false); }}>
          <DialogTitle>Modifier l&apos;événement — {event.pet.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type selector */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-1">
              {EVENT_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn(
                    "py-2 rounded-lg border text-xs font-medium transition-colors",
                    type === value
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Walk: duration */}
          {type === "WALK" && (
            <div className="space-y-1.5">
              <Label>Durée</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={600}
                  value={duration}
                  onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
          )}

          {/* Walk + Litter: pee/poop */}
          {(type === "WALK" || type === "LITTER") && (
            <div className="space-y-1.5">
              <Label>Besoins</Label>
              <div className="flex gap-2">
                <ToggleButton active={hasPee} onClick={() => setHasPee(!hasPee)} color="blue">
                  💧 Pipi
                </ToggleButton>
                <ToggleButton active={hasPoop} onClick={() => setHasPoop(!hasPoop)} color="amber">
                  💩 Caca
                </ToggleButton>
              </div>
            </div>
          )}

          {/* Walk: exertion */}
          {type === "WALK" && (
            <div className="space-y-1.5">
              <Label>Dépense physique</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {EXERTION.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setExertion(exertion === value ? null : value)}
                    className={cn(
                      "flex flex-col items-center py-2 rounded-xl border text-xs font-medium transition-all gap-1",
                      exertion === value
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className="text-lg leading-none">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Litter: action radio */}
          {type === "LITTER" && (
            <div className="space-y-1.5">
              <Label>Entretien</Label>
              <div className="flex gap-2">
                {(["cleaned", "changed"] as LitterAction[]).map(opt => (
                  <ToggleButton
                    key={opt}
                    active={litterAction === opt}
                    onClick={() => setLitterAction(litterAction === opt ? null : opt)}
                    color={opt === "changed" ? "blue" : "green"}
                  >
                    {opt === "cleaned" ? "🧹 Nettoyée" : "♻️ Changée"}
                  </ToggleButton>
                ))}
              </div>
            </div>
          )}

          {/* Date/time */}
          <div className="space-y-1.5">
            <Label>Date et heure</Label>
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground font-normal text-xs">(optionnel)</span></Label>
            <Input
              placeholder="Note..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={save} disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button
              variant={confirmDelete ? "destructive" : "outline"}
              onClick={handleDelete}
              disabled={deleting}
              className="shrink-0"
            >
              {deleting ? "..." : confirmDelete ? "Confirmer" : "Supprimer"}
            </Button>
          </div>
          {confirmDelete && (
            <p className="text-xs text-destructive text-center -mt-2">
              Cliquez à nouveau pour confirmer la suppression
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
