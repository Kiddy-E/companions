import { getTranslations } from "next-intl/server";
import { EVENT_EMOJI, isEventKey } from "@/lib/event-labels";

// Server helper: returns a function mapping an event type to its emoji + translated label.
export async function getEventMeta() {
  const t = await getTranslations("events");
  return (type: string) => ({
    emoji: EVENT_EMOJI[type] ?? "📝",
    label: isEventKey(type) ? t(type) : type,
  });
}
