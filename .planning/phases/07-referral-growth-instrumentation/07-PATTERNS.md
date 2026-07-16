# Phase 7: Referral & Growth Instrumentation - Patterns

This document defines the code templates, query structures, and metric calculations for implementing Phase 7.

## Deep-Link Generation

Referral cards generate pre-filled wa.me links containing referrer UUID tags:

```typescript
export function buildReferralDeepLink(referrerPurohitId: string, botNumber: string): string {
  const inviteText = `invite:${referrerPurohitId}`;
  return `https://wa.me/${botNumber}?text=${encodeURIComponent(inviteText)}`;
}
```

## Invite Parsing

We capture incoming invite codes on first webhook contacts:

```typescript
export function parseInviteCode(text: string): string | null {
  const match = text.match(/^invite:([a-f0-9-]{36})$/i);
  return match ? match[1] : null;
}
```

## Cohort Grouping Query

Purohit signups are grouped into weekly cohorts:

```typescript
export async function getWeeklyCohortMetrics() {
  const { db, purohitsTable, sql } = await import("@workspace/db");
  
  // Group signups by week start (Monday)
  const query = sql`
    SELECT 
      date_trunc('week', created_at) AS week,
      count(*) AS cohort_size,
      count(referred_by_purohit_id) AS referred_signups
    FROM ${purohitsTable}
    GROUP BY week
    ORDER BY week DESC
  `;
  
  return await db.execute(query);
}
```
