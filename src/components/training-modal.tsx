"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function toDatetimeLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Props {
  petId: string;
  petName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knownSkills?: string[];
}

export function TrainingModal({ petId, petName, open, onOpenChange, knownSkills = [] }: Props) {
  const router = useRouter();
  const [skill, setSkill] = useState("");
  const [duration, setDuration] = useState(15);
  const [stars, setStars] = useState<number | null>(null);
  const [progress, setProgress] = useState(50);
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(new Date()));
  const [loading, setLoading] = useState(false);

  function reset() {
    setSkill("");
    setDuration(15);
    setStars(null);
    setProgress(50);
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
          type: "TRAINING",
          durationMin: duration > 0 ? duration : undefined,
          note: note.trim() || undefined,
          occurredAt: new Date(occurredAt).toISOString(),
          metadata: {
            skill: skill.trim() || "Général",
            progress,
            ...(stars !== null ? { stars } : {}),
          },
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
          <DialogTitle>🏅 Dressage — {petName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Skill */}
          <div className="space-y-1.5">
            <Label>Compétence</Label>
            <Input
              placeholder="Ex : Assis, Couché, Rappel..."
              value={skill}
              onChange={e => setSkill(e.target.value)}
              list="skills-list"
            />
            {knownSkills.length > 0 && (
              <datalist id="skills-list">
                {knownSkills.map(s => <option key={s} value={s} />)}
              </datalist>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Niveau de maîtrise</Label>
              <span className="text-sm font-medium text-primary">{progress}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stars */}
          <div className="space-y-1.5">
            <Label>Note de la séance</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(stars === n ? null : n)}
                  className={cn(
                    "text-2xl leading-none transition-all hover:scale-110",
                    stars !== null && n <= stars ? "opacity-100" : "opacity-30"
                  )}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label>Durée</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={240}
                value={duration}
                onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>

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
              placeholder="Observations de la séance..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={submit} disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
