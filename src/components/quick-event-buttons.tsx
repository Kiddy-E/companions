"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WalkModal } from "@/components/walk-modal";
import { LitterModal } from "@/components/litter-modal";
import { QuickEventModal } from "@/components/quick-event-modal";
import { getSpeciesProfile, SPECIES_QUICK_ACTIONS, EVENT_LABEL_MAP } from "@/lib/species-profiles";
import { formatRelativeTime } from "@/lib/date-utils";

interface Props {
  petId: string;
  petName: string;
  species: string;
  // ISO date strings keyed by event type — when each was last recorded
  lastEvents?: Record<string, string>;
}

type ModalState =
  | { type: "walk" }
  | { type: "litter" }
  | { type: "generic"; eventType: string }
  | null;

export function QuickEventButtons({ petId, petName, species, lastEvents = {} }: Props) {
  const [modal, setModal] = useState<ModalState>(null);

  const profile = getSpeciesProfile(species);
  const actions = SPECIES_QUICK_ACTIONS[profile];

  const isFullWidth = (t: string) => t === "WALK" || t === "LITTER";
  const fullWidthActions = actions.filter(isFullWidth);
  const gridActions = actions.filter(t => !isFullWidth(t));

  function handleClick(type: string) {
    if (type === "WALK")   return setModal({ type: "walk" });
    if (type === "LITTER") return setModal({ type: "litter" });
    setModal({ type: "generic", eventType: type });
  }

  function renderButton(type: string, fullWidth = false) {
    const { emoji, label } = EVENT_LABEL_MAP[type] ?? { emoji: "📝", label: type };
    const last = lastEvents[type];
    return (
      <Button
        key={type}
        variant="outline"
        size="sm"
        className={`text-xs h-auto py-1.5 px-2 justify-start flex-col items-start gap-0 ${fullWidth ? "w-full" : ""}`}
        onClick={() => handleClick(type)}
      >
        <span>{emoji} {label}</span>
        {last && (
          <span className="text-[10px] text-muted-foreground font-normal leading-tight">
            {formatRelativeTime(last)}
          </span>
        )}
      </Button>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {fullWidthActions.map(t => renderButton(t, true))}
        <div className="grid grid-cols-2 gap-1.5">
          {gridActions.map(t => renderButton(t, false))}
        </div>
      </div>

      <WalkModal
        petId={petId}
        petName={petName}
        open={modal?.type === "walk"}
        onOpenChange={v => { if (!v) setModal(null); }}
      />
      <LitterModal
        petId={petId}
        petName={petName}
        open={modal?.type === "litter"}
        onOpenChange={v => { if (!v) setModal(null); }}
      />
      {modal?.type === "generic" && (
        <QuickEventModal
          petId={petId}
          petName={petName}
          eventType={modal.eventType}
          open
          onOpenChange={v => { if (!v) setModal(null); }}
        />
      )}
    </>
  );
}
