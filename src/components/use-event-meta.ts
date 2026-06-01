"use client";

import { useTranslations } from "next-intl";
import { EVENT_EMOJI, isEventKey } from "@/lib/event-labels";

// Client hook: returns a function mapping an event type to its emoji + translated label.
export function useEventMeta() {
  const t = useTranslations("events");
  return (type: string) => ({
    emoji: EVENT_EMOJI[type] ?? "📝",
    label: isEventKey(type) ? t(type) : type,
  });
}
