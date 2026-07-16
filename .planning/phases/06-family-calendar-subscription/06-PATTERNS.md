# Phase 6: Family Calendar Subscription - Patterns

This document defines the code templates, mandate links, and isolation checks for implementing Phase 6.

## UPI Autopay Mandate Construct

Mandate links are constructed using standard recurring mandate specifications:

```typescript
export function buildAutopayDeepLink(
  yajmanId: string,
  merchantVpa: string,
  payeeName: string
): string {
  const params = new URLSearchParams({
    pa: merchantVpa,
    pn: payeeName,
    am: "29.00",
    cu: "INR",
    mc: "8999", // Merchant category code for subscriptions
    tr: yajmanId, // Transaction reference tracking yajman ID
    recur: "MONTHLY",
  });
  return `upi://mandate?${params.toString()}`;
}
```

## Subscription Checker Query

We run updates on expired subscriptions:

```typescript
export async function runSubscriptionStateCheck(): Promise<void> {
  const { db, yajmansTable, lte, eq, and } = await import("@workspace/db");
  
  await db
    .update(yajmansTable)
    .set({ familySubStatus: "lapsed" })
    .where(
      and(
        eq(yajmansTable.familySubStatus, "active"),
        lte(yajmansTable.familySubRenewsAt, new Date())
      )
    );
}
```

## Tenant Isolation Check

To prevent cross-purohit data discovery, verify that the yajman number belongs to the context:

```typescript
export async function assertYajmanBelongsToPurohit(
  yajmanNumber: string,
  targetPurohitId: string
): Promise<void> {
  const { db, yajmansTable, and, eq } = await import("@workspace/db");
  
  const records = await db
    .select()
    .from(yajmansTable)
    .where(
      and(
        eq(yajmansTable.whatsappNumber, yajmanNumber),
        eq(yajmansTable.purohitId, targetPurohitId)
      )
    );
    
  if (records.length === 0) {
    throw new Error("Access Denied: Yajman relation not found");
  }
}
```
