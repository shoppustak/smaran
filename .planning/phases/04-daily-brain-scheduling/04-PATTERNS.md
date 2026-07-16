# Phase 4: Daily Brain — Scheduling & Lapse Recovery - Patterns

This document defines the code templates, database query patterns, and cron scheduling routines for implementing Phase 4.

## Cron Authorization Check

The cron endpoint verifies authorization via header validation matching `CRON_SECRET`:

```typescript
const cronSecret = req.headers["x-cron-secret"];
if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
  res.status(401).json({ error: "Unauthorized" });
  return;
}
```

## Month Translation (Amanta vs. Purnimanta)

Under the Purnimanta calendar system, the lunar month starts on the full moon (Purnima). Thus, the dark fortnight (Krishna Paksha) belongs to the *following* month relative to the Amanta system:

```typescript
export function resolvePurnimantaMaas(amantaMaas: string, paksha: "Shukla" | "Krishna"): string {
  if (paksha === "Shukla") {
    return amantaMaas;
  }
  
  // Array of months in sequence
  const months = [
    "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
    "Ashvina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
  ];
  
  const idx = months.indexOf(amantaMaas);
  if (idx === -1) return amantaMaas;
  
  // Krishna Paksha in Purnimanta belongs to the next month's name
  const nextIdx = (idx + 1) % 12;
  return months[nextIdx];
}
```

## Batch Dispatch Pattern

We concurrent-batch notifications to avoid hitting Meta rate-limits:

```typescript
const CHUNK_SIZE = 20;
for (let i = 0; i < alerts.length; i += CHUNK_SIZE) {
  const chunk = alerts.slice(i, i + CHUNK_SIZE);
  await Promise.all(
    chunk.map(async (alert) => {
      try {
        await sendPreRitualAlerts(alert);
      } catch (err) {
        logger.error(`Failed to send alert for event ${alert.eventId}`, err);
      }
    })
  );
  // Optional delay between chunks
  await new Promise((resolve) => setTimeout(resolve, 100));
}
```
