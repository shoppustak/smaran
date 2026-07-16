export class MuhuratCollisionError extends Error {
  constructor(public eventTitle: string, public details: string) {
    super(`Muhurat collision detected: ${eventTitle} (${details})`);
    this.name = "MuhuratCollisionError";
  }
}

export function resolveMuhuratWindow(timeStr: string): "morning" | "afternoon" | "evening" | "night" {
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10);
  
  if (hours >= 6 && hours < 12) {
    return "morning";
  } else if (hours >= 12 && hours < 16) {
    return "afternoon";
  } else if (hours >= 16 && hours < 20) {
    return "evening";
  } else {
    return "night";
  }
}

export function parseGregorianHint(hint: string | null | undefined): { date: Date | null; time: string | null } {
  if (!hint || typeof hint !== "string") {
    return { date: null, time: null };
  }
  
  // Try to find a time string HH:MM
  const timeMatch = hint.match(/(\d{2}):(\d{2})/);
  const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null;
  
  // Try to parse the date part. E.g. "2026-07-15"
  const dateStr = hint.split(/[T ]/)[0];
  const parsedDate = new Date(dateStr);
  const date = isNaN(parsedDate.getTime()) ? null : parsedDate;
  
  return { date, time };
}

export function windowFromTime(timeStr: string | null): "morning" | "afternoon" | "evening" | "night" {
  if (!timeStr) return "morning";
  return resolveMuhuratWindow(timeStr);
}

export async function getMuhuratCollision(
  purohitId: string,
  ritual: { maas: string; paksha: string; tithi: number },
  window: "morning" | "afternoon" | "evening" | "night"
): Promise<any | null> {
  const { db, eventsTable } = await import("@workspace/db");
  const { eq, and } = await import("drizzle-orm");

  const existing = await db
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.purohitId, purohitId),
        eq(eventsTable.maas, ritual.maas),
        eq(eventsTable.paksha, ritual.paksha),
        eq(eventsTable.tithi, ritual.tithi)
      )
    );
    
  const conflict = existing.find((event) => {
    const eventWindow = event.resolvedWindow ?? windowFromTime(event.time);
    return eventWindow === window;
  });
  
  return conflict || null;
}

export async function hasMuhuratCollision(
  purohitId: string,
  ritual: { maas: string; paksha: string; tithi: number },
  window: "morning" | "afternoon" | "evening" | "night"
): Promise<boolean> {
  const conflict = await getMuhuratCollision(purohitId, ritual, window);
  return conflict !== null;
}
