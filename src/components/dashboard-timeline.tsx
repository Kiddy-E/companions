"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RelativeTime } from "@/components/relative-time";
import { EditEventModal, type EventRecord } from "@/components/edit-event-modal";
import { EVENT_LABEL_MAP } from "@/lib/species-profiles";

interface TimelineEvent {
  id: string;
  type: string;
  occurredAt: string;
  durationMin?: number | null;
  note?: string | null;
  metadata?: unknown;
  petId: string;
  pet: { id: string; name: string; species: string };
  user: { id: string; username: string };
}

interface Props {
  events: TimelineEvent[];
  currentUserId: string;
  isAdmin: boolean;
}

export function DashboardTimeline({ events: initialEvents, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState<EventRecord | null>(null);

  function canEdit(e: TimelineEvent) {
    return isAdmin || e.user.id === currentUserId;
  }

  function toRecord(e: TimelineEvent): EventRecord {
    return { ...e, pet: { id: e.pet.id, name: e.pet.name } };
  }

  function handleSave(updated: EventRecord) {
    setEvents(prev => prev.map(e => e.id !== updated.id ? e : {
      ...e,
      type: updated.type,
      occurredAt: typeof updated.occurredAt === "string" ? updated.occurredAt : updated.occurredAt.toISOString(),
      durationMin: updated.durationMin,
      note: updated.note,
      metadata: updated.metadata,
    }));
    router.refresh();
  }

  function handleDelete(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardContent className="p-0 divide-y">
          {events.slice(0, 15).map((e) => {
            const { emoji, label } = EVENT_LABEL_MAP[e.type] ?? { emoji: "📝", label: e.type };
            const meta = e.metadata as { hasPee?: boolean; hasPoop?: boolean; grams?: number } | null;
            const details: string[] = [];
            if (e.durationMin) details.push(`${e.durationMin} min`);
            if (meta?.hasPee) details.push("💧");
            if (meta?.hasPoop) details.push("💩");
            if (meta?.grams) details.push(`${meta.grams} g`);
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 group">
                <span className="text-base flex-shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{e.pet.name}</span>
                  <span className="text-xs text-muted-foreground"> · {new Date(e.occurredAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-sm text-muted-foreground"> — {label}</span>
                  {details.length > 0 && (
                    <span className="text-xs text-muted-foreground"> · {details.join(" ")}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      <RelativeTime date={e.occurredAt} />
                    </p>
                    <p className="text-xs text-muted-foreground/60">{e.user.username}</p>
                  </div>
                  {canEdit(e) && (
                    <button
                      onClick={() => setEditing(toRecord(e))}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {events.length > 15 && (
            <div className="px-4 py-2.5 text-center">
              <Link href="/journal" className="text-xs text-primary hover:underline">
                Voir les {events.length - 15} autres événements →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="text-right">
        <Link href="/journal" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Journal complet →
        </Link>
      </div>

      {editing && (
        <EditEventModal
          event={editing}
          open={!!editing}
          onOpenChange={v => { if (!v) setEditing(null); }}
          onSave={handleSave}
          onDelete={() => { handleDelete(editing.id); setEditing(null); }}
        />
      )}
    </>
  );
}
