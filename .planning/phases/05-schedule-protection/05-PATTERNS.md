# Phase 5: Schedule Protection - Patterns

This document defines the code templates, query structures, and collision handlers for implementing Phase 5.

## Muhurat Window Parsing

Times are parsed from strings to resolve their respective windows:

```typescript
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
```

## Overlap Query Structure

We query for other events scheduled on the same date and overlapping windows:

```typescript
export async function hasMuhuratCollision(
  purohitId: string,
  gregorianDate: Date,
  timeStr: string
): Promise<boolean> {
  const { db, eventsTable, eq, and } = await import("@workspace/db");
  const targetWindow = resolveMuhuratWindow(timeStr);
  
  const existing = await db
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.purohitId, purohitId),
        eq(eventsTable.date, gregorianDate)
      )
    );
    
  return existing.some((event) => resolveMuhuratWindow(event.time) === targetWindow);
}
```

## Formatting Day-Sheets

We group events by date and window to format the WhatsApp output text:

```typescript
export function formatDaySheet(bookings: Booking[]): string {
  let output = "📅 आपका साप्ताहिक कार्यक्रम:\n";
  const grouped = groupByDate(bookings);
  
  for (const [date, events] of Object.entries(grouped)) {
    output += `\n*${date}*\n`;
    for (const event of events) {
      const windowEmoji = getWindowEmoji(event.time);
      output += `${windowEmoji} ${event.time} - ${event.eventLabel} (यजमान: ${event.familyName})\n`;
    }
  }
  return output;
}
```
