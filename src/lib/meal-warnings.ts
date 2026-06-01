interface MealTime { time: string; grams?: number }
interface MealEvent { occurredAt: Date | string; metadata?: unknown }

interface MealWarning {
  type: "missed" | "insufficient";
  slotTime: string;
  given: number;
  target: number;
}

export function checkMealWarnings(
  meals: MealTime[],
  defaultGrams: number | undefined,
  todayMealEvents: MealEvent[],
  now: Date,
): MealWarning[] {
  if (!meals.length) return [];

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Sort slots by time
  const sorted = [...meals].sort((a, b) => {
    const [ah, am] = a.time.split(":").map(Number);
    const [bh, bm] = b.time.split(":").map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });

  const warnings: MealWarning[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const slot = sorted[i];
    const [slotH, slotM] = slot.time.split(":").map(Number);
    const slotMinutes = slotH * 60 + slotM;

    // Only check slots that have already passed (with 15min grace)
    if (slotMinutes + 15 > nowMinutes) continue;

    // Window: from this slot time to the next slot time (or end of day)
    const slotStart = new Date(todayStart);
    slotStart.setHours(slotH, slotM, 0, 0);

    const nextSlot = sorted[i + 1];
    const windowEnd = nextSlot
      ? (() => {
          const d = new Date(todayStart);
          const [nh, nm] = nextSlot.time.split(":").map(Number);
          d.setHours(nh, nm, 0, 0);
          return d;
        })()
      : new Date(now);

    const mealsInWindow = todayMealEvents.filter((e) => {
      const t = new Date(e.occurredAt);
      return t >= slotStart && t < windowEnd;
    });

    const target = slot.grams ?? defaultGrams;

    if (mealsInWindow.length === 0) {
      warnings.push({ type: "missed", slotTime: slot.time, given: 0, target: target ?? 0 });
      continue;
    }

    if (target) {
      const totalGrams = mealsInWindow.reduce((sum, e) => {
        const meta = e.metadata as { grams?: number } | null;
        return sum + (meta?.grams ?? 0);
      }, 0);
      if (totalGrams > 0 && totalGrams < target) {
        warnings.push({ type: "insufficient", slotTime: slot.time, given: totalGrams, target });
      }
    }
  }

  return warnings;
}

type MealWarningTranslator = (
  key: "missed" | "insufficient",
  values: { time: string; given: number; target: number }
) => string;

export function formatMealWarnings(
  warnings: MealWarning[],
  t: MealWarningTranslator
): string | null {
  if (!warnings.length) return null;
  return warnings
    .map((w) =>
      t(w.type, { time: w.slotTime, given: w.given, target: w.target })
    )
    .join(" · ");
}
