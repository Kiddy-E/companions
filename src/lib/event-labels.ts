// Emoji per event type — language-independent, kept out of translation files.
export const EVENT_EMOJI: Record<string, string> = {
  WALK: "🦮",
  MEAL: "🍽️",
  PEE: "💧",
  POOP: "💩",
  MED: "💊",
  BATH: "🛁",
  LITTER: "🪣",
  PLAY: "🎾",
  GROOM: "✂️",
  WATER_CHANGE: "💧",
  TRAINING: "🏅",
  OTHER: "📝",
};

// Ordered list of event type keys (matches the `events` translation namespace).
export const EVENT_KEYS = [
  "WALK", "MEAL", "PEE", "POOP", "MED", "BATH",
  "LITTER", "PLAY", "GROOM", "WATER_CHANGE", "TRAINING", "OTHER",
] as const;
export type EventKey = (typeof EVENT_KEYS)[number];

export function isEventKey(value: string): value is EventKey {
  return (EVENT_KEYS as readonly string[]).includes(value);
}

// Physical exertion levels for walks — emoji only, labels come from translations.
export const EXERTION_EMOJI: Record<number, string> = {
  0: "🛋️",
  1: "🚶",
  2: "🏃",
  3: "🔥",
};
export const EXERTION_KEYS = ["rest", "stroll", "active", "intense"] as const;
