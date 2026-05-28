interface EventRow {
  petId: string;
  type: string;
  occurredAt: Date;
  metadata?: unknown;
}

interface NeedsMeta {
  hasPee?: boolean;
  hasPoop?: boolean;
}

/**
 * Build a map of { petId → { eventType → ISO date } } from a flat list of events.
 * WALK and LITTER events with hasPee/hasPoop in metadata also update the PEE/POOP entries.
 */
export function buildLastEventMap(events: EventRow[]): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();

  // Events are expected to come in DESC order; process them so earliest seen wins
  // (we want the LATEST, so we set only if not already set — caller must pass DESC)
  for (const ev of events) {
    if (!map.has(ev.petId)) map.set(ev.petId, {});
    const petMap = map.get(ev.petId)!;
    const iso = ev.occurredAt instanceof Date
      ? ev.occurredAt.toISOString()
      : new Date(ev.occurredAt).toISOString();

    // Direct event type
    if (!petMap[ev.type]) petMap[ev.type] = iso;

    // Walk / litter pee+poop metadata → also update PEE / POOP
    if (ev.type === "WALK" || ev.type === "LITTER") {
      const meta = ev.metadata as NeedsMeta | null;
      if (meta?.hasPee && !petMap["PEE"]) petMap["PEE"] = iso;
      if (meta?.hasPoop && !petMap["POOP"]) petMap["POOP"] = iso;
    }
  }

  return map;
}
