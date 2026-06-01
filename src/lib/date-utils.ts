// Locale-independent breakdown of a relative time — callers translate via the
// `relativeTime` namespace: t(unit, { count }).
export type RelativeTimeUnit =
  | "justNow"
  | "minutesAgo"
  | "hoursAgo"
  | "daysAgo"
  | "weeksAgo";

export interface RelativeTimeParts {
  unit: RelativeTimeUnit;
  count: number;
}

export function getRelativeTimeParts(date: Date | string): RelativeTimeParts {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return { unit: "justNow", count: 0 };
  if (minutes < 60) return { unit: "minutesAgo", count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: "hoursAgo", count: hours };
  const days = Math.floor(hours / 24);
  if (days < 7) return { unit: "daysAgo", count: days };
  return { unit: "weeksAgo", count: Math.floor(days / 7) };
}

export function differenceInYears(a: Date, b: Date): number {
  const years = a.getFullYear() - b.getFullYear();
  const m = a.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && a.getDate() < b.getDate())) return years - 1;
  return years;
}

export function differenceInMonths(a: Date, b: Date): number {
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}
