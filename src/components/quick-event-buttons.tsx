"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { WalkModal } from "@/components/walk-modal";
import { LitterModal } from "@/components/litter-modal";
import { MealModal } from "@/components/meal-modal";
import { TrainingModal } from "@/components/training-modal";
import { QuickEventModal } from "@/components/quick-event-modal";
import { getSpeciesProfile, SPECIES_QUICK_ACTIONS } from "@/lib/species-profiles";
import { useEventMeta } from "@/components/use-event-meta";
import { getRelativeTimeParts } from "@/lib/date-utils";

interface Props {
  petId: string;
  petName: string;
  species: string;
  lastEvents?: Record<string, string>;
  knownSkills?: string[];
  defaultMealGrams?: number;
}

type ModalState =
  | { type: "walk" }
  | { type: "litter" }
  | { type: "meal" }
  | { type: "training" }
  | { type: "generic"; eventType: string }
  | null;

export function QuickEventButtons({
  petId, petName, species,
  lastEvents = {}, knownSkills = [], defaultMealGrams,
}: Props) {
  const [modal, setModal] = useState<ModalState>(null);
  const eventMeta = useEventMeta();
  const tRelative = useTranslations("relativeTime");

  const profile = getSpeciesProfile(species);
  const actions = SPECIES_QUICK_ACTIONS[profile];

  const isFullWidth = (t: string) => t === "WALK" || t === "LITTER";
  const fullWidthActions = actions.filter(isFullWidth);
  const gridActions = actions.filter(t => !isFullWidth(t));

  function handleClick(type: string) {
    if (type === "WALK")     return setModal({ type: "walk" });
    if (type === "LITTER")   return setModal({ type: "litter" });
    if (type === "MEAL")     return setModal({ type: "meal" });
    if (type === "TRAINING") return setModal({ type: "training" });
    setModal({ type: "generic", eventType: type });
  }

  function renderButton(type: string, fullWidth = false) {
    const { emoji, label } = eventMeta(type);
    const last = lastEvents[type];
    const parts = last ? getRelativeTimeParts(last) : null;
    return (
      <Button
        key={type}
        variant="outline"
        size="sm"
        className={`text-xs h-auto py-1.5 px-2 justify-start flex-col items-start gap-0 ${fullWidth ? "w-full" : ""}`}
        onClick={() => handleClick(type)}
      >
        <span>{emoji} {label}</span>
        {parts && (
          <span className="text-[10px] text-muted-foreground font-normal leading-tight">
            {tRelative(parts.unit, { count: parts.count })}
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

      <WalkModal petId={petId} petName={petName} open={modal?.type === "walk"} onOpenChange={v => { if (!v) setModal(null); }} />
      <LitterModal petId={petId} petName={petName} open={modal?.type === "litter"} onOpenChange={v => { if (!v) setModal(null); }} />
      <MealModal petId={petId} petName={petName} open={modal?.type === "meal"} onOpenChange={v => { if (!v) setModal(null); }} defaultGrams={defaultMealGrams} />
      <TrainingModal petId={petId} petName={petName} open={modal?.type === "training"} onOpenChange={v => { if (!v) setModal(null); }} knownSkills={knownSkills} />
      {modal?.type === "generic" && (
        <QuickEventModal petId={petId} petName={petName} eventType={modal.eventType} open onOpenChange={v => { if (!v) setModal(null); }} />
      )}
    </>
  );
}
