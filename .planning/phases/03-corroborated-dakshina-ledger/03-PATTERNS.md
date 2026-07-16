# Phase 3: Corroborated Dakshina Ledger - Patterns

This document defines the code templates, database query patterns, and webhook routing conventions for implementing Phase 3.

## Database Access

To satisfy the sandboxing constraint (allowing routes and scripts to typecheck and load even if `DATABASE_URL` is not set), all database access must use dynamic gating:

```typescript
if (!process.env.DATABASE_URL) {
  logger.warn("Database URL not set; skipping database operation");
  return;
}

const { db, ledgerTable, eq } = await import("@workspace/db");
// Perform database queries...
```

## UPI Deep Link Construction

UPI deep links must be generated as raw strings using the `upi://pay` URI scheme. All parameters must be URI encoded:

```typescript
export function buildUpiDeepLink(
  vpa: string,
  payeeName: string,
  amount: number,
  transactionNote: string
): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: amount.toFixed(2),
    tn: transactionNote,
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}
```

## Webhook Button Tap Parsing

Incoming WhatsApp interactive button actions carry unique `payload_id` values. In Phase 3, we define the following colon-delimited grammar:

```
ledger-claim:{ledgerId}
ledger-confirm:{ledgerId}
```

The webhook parses these IDs dynamically:

```typescript
const parts = payloadId.split(":");
const action = parts[0];
const ledgerId = parts[1];

if (action === "ledger-claim") {
  // Execute claim flow...
} else if (action === "ledger-confirm") {
  // Execute confirmation flow...
}
```

## Webhook Security & Gating

Every webhook action must verify that the sender has ownership rights over the resource they are mutating:

```typescript
// For claims (Purohit)
const purohit = await findPurohitByPhone(msg.from);
if (!purohit || ledger.purohitId !== purohit.id) {
  logger.warn(`Unauthorized claim attempt on ledger ${ledgerId} by ${msg.from}`);
  return; // Fail silently or log
}

// For confirmations (Family)
const yajman = await findYajmanByPhone(msg.from);
if (!yajman || ledger.yajmanId !== yajman.id) {
  logger.warn(`Unauthorized confirmation attempt on ledger ${ledgerId} by ${msg.from}`);
  return;
}
```
