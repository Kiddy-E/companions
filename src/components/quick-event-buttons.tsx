"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WalkModal } from "@/components/walk-modal";
import { LitterModal } from "@/components/litter-modal";
import { QuickEventModal } from "@/components/quick-event-modal";
import { getSpeciesProfile, SPECIES_QUICK_ACTIONS, EVENT_LABEL_MAP } from "@/lib/species-profiles";

interface Props {
  petId: string;
  petName: string;
  species: string;
}

type ModalState =
  | { type: "walk" }
  | { type: "litter" }
  | { type: "generic"; eventType: string }
  | null;

export function QuickEventButtons({ petId, petName, species }: Props) {
  const [modal, setModal] = useState<ModalState>(null);

  const profile = getSpeciesProfile(species);
  const actions = SPECIES_QUICK_ACTIONS[profile];

  // WALK and LITTER are full-width (first slot), others are 2-column grid
  const isFullWidth = (t: string) => t === "WALK" || t === "LITTER";
  const fullWidthActions = actions.filter(isFullWidth);
  const gridActions = actions.filter(t => !isFullWidth(t));

  function handleClick(type: string) {
    if (type === "WALK") return setModal({ type: "walk" });
    if (type === "LITTER") return setModal({ type: "litter" });
    setModal({ type: "generic", eventType: type });
  }

  return (
    <>
      <div className="space-y-1.5">
        {/* Full-width buttons (WALK / LITTER) */}
        {fullWidthActions.map(type => {
          const { emoji, label } = EVENT_LABEL_MAP[type] ?? { emoji: "📝", label: type };
          return (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 px-2 justify-start"
              onClick={() => handleClick(type)}
            >
              {emoji} {label}
            </Button>
          );
        })}
        {/* 2-col grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {gridActions.map(type => {
            const { emoji, label } = EVENT_LABEL_MAP[type] ?? { emoji: "📝", label: type };
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className="text-xs h-8 px-2 justify-start"
                onClick={() => handleClick(type)}
              >
                {emoji} {label}
              </Button>
            );
          })}
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
