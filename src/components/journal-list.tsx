"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EditEventModal, type EventRecord } from "@/components/edit-event-modal";

const EVENT_META: Record<string, { emoji: string; label: string }> = {
  WALK:         { emoji: "🦮", label: "Sortie" },
  MEAL:         { emoji: "🍽️", label: "Repas" },
  PEE:          { emoji: "💧", label: "Pipi" },
  POOP:         { emoji: "💩", label: "Caca" },
  MED:          { emoji: "💊", label: "Soin" },
  BATH:         { emoji: "🛁", label: "Bain" },
  LITTER:       { emoji: "🪣", label: "Litière" },
  PLAY:         { emoji: "🎾", label: "Jeu" },
  GROOM:        { emoji: "✂️", label: "Toilettage" },
  WATER_CHANGE: { emoji: "💧", label: "Eau" },
  TRAINING:     { emoji: "🏅", label: "Dressage" },
  OTHER:        { emoji: "📝", label: "Autre" },
};

const EXERTION_LABELS: Record<number, string> = { 0: "🛋️ Repos", 1: "🚶 Balade", 2: "🏃 Actif", 3: "🔥 Intense" };

interface WalkMeta {
  hasPee?: boolean;
  hasPoop?: boolean;
  exertion?: number;
}

interface LitterMeta {
  hasPee?: boolean;
  hasPoop?: boolean;
  cleaned?: boolean;
}

function WalkDetails({ metadata }: { metadata: unknown }) {
  const meta = (metadata as WalkMeta) ?? {};
  const tags: string[] = [];
  if (meta.hasPee) tags.push("💧");
  if (meta.hasPoop) tags.push("💩");
  if (meta.exertion !== undefined) tags.push(EXERTION_LABELS[meta.exertion] ?? "");
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map((t, i) => (
        <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded-md">{t}</span>
      ))}
    </div>
  );
}

function LitterDetails({ metadata }: { metadata: unknown }) {
  const meta = (metadata as LitterMeta) ?? {};
  const tags: string[] = [];
  if (meta.hasPee) tags.push("💧 Pipi");
  if (meta.hasPoop) tags.push("💩 Caca");
  if (meta.cleaned) tags.push("✅ Nettoyée");
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map((t, i) => (
        <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded-md">{t}</span>
      ))}
    </div>
  );
}

interface Props {
  events: EventRecord[];
  currentUserId: string;
  isAdmin: boolean;
}

export function JournalList({ events: initialEvents, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<EventRecord[]>(initialEvents);
  const [editing, setEditing] = useState<EventRecord | null>(null);

  function canEdit(event: EventRecord) {
    return isAdmin || event.user.id === currentUserId;
  }

  function handleSave(updated: EventRecord) {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    router.refresh();
  }

  function handleDelete(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
    router.refresh();
  }

  // Group by day
  const grouped = new Map<string, EventRecord[]>();
  for (const event of events) {
    const day = new Date(event.occurredAt).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(event);
  }

  if (events.length === 0) return null;

  return (
    <>
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([day, dayEvents]) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
                {day}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {dayEvents.map((event, i) => {
                  const { emoji, label } = EVENT_META[event.type] ?? { emoji: "📝", label: event.type };
                  return (
                    <div key={event.id}>
                      <div className="flex items-start gap-3 py-2.5 group">
                        <span className="text-base leading-none mt-0.5 flex-shrink-0">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{label}</span>
                            <Badge variant="outline" className="text-xs">{event.pet.name}</Badge>
                            {event.durationMin && (
                              <Badge variant="secondary" className="text-xs">{event.durationMin} min</Badge>
                            )}
                          </div>
                          {event.type === "WALK" && event.metadata != null && (
                            <WalkDetails metadata={event.metadata} />
                          )}
                          {event.type === "LITTER" && event.metadata != null && (
                            <LitterDetails metadata={event.metadata} />
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.occurredAt).toLocaleTimeString("fr-FR", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">· {event.user.username}</span>
                          </div>
                          {event.note && (
                            <p className="text-xs text-muted-foreground italic mt-0.5">{event.note}</p>
                          )}
                        </div>
                        {canEdit(event) && (
                          <button
                            onClick={() => setEditing(event)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
                            aria-label="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {i < dayEvents.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <EditEventModal
          event={editing}
          open={!!editing}
          onOpenChange={v => { if (!v) setEditing(null); }}
          onSave={handleSave}
          onDelete={() => handleDelete(editing.id)}
        />
      )}
    </>
  );
}
