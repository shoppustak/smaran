import { eq, and, isNull, desc } from "drizzle-orm";
import type { Ledger } from "@workspace/db";

export class LedgerDbUnavailableError extends Error {
  constructor(message = "Database is not configured (DATABASE_URL is missing)") {
    super(message);
    this.name = "LedgerDbUnavailableError";
  }
}

export class LedgerNotFoundError extends Error {
  constructor(message = "Ledger entry not found") {
    super(message);
    this.name = "LedgerNotFoundError";
  }
}

export class LedgerOwnershipError extends Error {
  constructor(message = "Caller is not authorized for this ledger record") {
    super(message);
    this.name = "LedgerOwnershipError";
  }
}

export class LedgerStateTransitionError extends Error {
  constructor(message = "Invalid state transition requested") {
    super(message);
    this.name = "LedgerStateTransitionError";
  }
}

export async function createLedgerEntry(
  purohitId: string,
  yajmanId: string,
  eventId: string | null,
  amount: number | null,
  localityKey: string
): Promise<Ledger> {
  if (!process.env.DATABASE_URL) {
    throw new LedgerDbUnavailableError();
  }

  const { db, ledgerTable } = await import("@workspace/db");

  const [entry] = await db
    .insert(ledgerTable)
    .values({
      purohitId,
      yajmanId,
      eventId,
      amountCollected: amount !== null ? amount.toFixed(2) : null,
      paymentStatus: "pending",
      localityKey,
    })
    .returning();

  if (!entry) {
    throw new Error("Failed to create ledger entry");
  }

  return entry;
}

export async function claimLedgerEntry(
  ledgerId: string,
  claimingPurohitId: string
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new LedgerDbUnavailableError();
  }

  const { db, ledgerTable } = await import("@workspace/db");

  const [ledger] = await db
    .select()
    .from(ledgerTable)
    .where(eq(ledgerTable.id, ledgerId))
    .limit(1);

  if (!ledger) {
    throw new LedgerNotFoundError(`Ledger entry ${ledgerId} not found`);
  }

  if (ledger.purohitId !== claimingPurohitId) {
    throw new LedgerOwnershipError(`Purohit ${claimingPurohitId} is not authorized for ledger entry ${ledgerId}`);
  }

  if (ledger.paymentStatus === "claimed" || ledger.paymentStatus === "corroborated") {
    // Idempotency: silent exit
    return;
  }

  if (ledger.paymentStatus !== "pending") {
    throw new LedgerStateTransitionError(`Cannot transition ledger ${ledgerId} from status ${ledger.paymentStatus} to claimed`);
  }

  await db
    .update(ledgerTable)
    .set({
      paymentStatus: "claimed",
      purohitClaimedAt: new Date(),
    })
    .where(eq(ledgerTable.id, ledgerId));
}

export async function confirmLedgerEntry(
  ledgerId: string,
  confirmingYajmanId: string
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new LedgerDbUnavailableError();
  }

  const { db, ledgerTable, occurrencesTable, eventsTable } = await import("@workspace/db");

  const [ledger] = await db
    .select()
    .from(ledgerTable)
    .where(eq(ledgerTable.id, ledgerId))
    .limit(1);

  if (!ledger) {
    throw new LedgerNotFoundError(`Ledger entry ${ledgerId} not found`);
  }

  if (ledger.yajmanId !== confirmingYajmanId) {
    throw new LedgerOwnershipError(`Yajman ${confirmingYajmanId} is not authorized for ledger entry ${ledgerId}`);
  }

  if (ledger.paymentStatus === "corroborated") {
    // Idempotency: silent exit
    return;
  }

  if (ledger.paymentStatus !== "claimed") {
    throw new LedgerStateTransitionError(`Cannot transition ledger ${ledgerId} from status ${ledger.paymentStatus} to corroborated`);
  }

  await db
    .update(ledgerTable)
    .set({
      paymentStatus: "corroborated",
      familyConfirmedAt: new Date(),
    })
    .where(eq(ledgerTable.id, ledgerId));

  if (ledger.eventId) {
    const cycleYear = new Date().getFullYear(); // Occurrences created live via ledger correspond to current cycle year
    
    // Upsert occurrence for both parties
    await db
      .insert(occurrencesTable)
      .values({
        eventId: ledger.eventId,
        yajmanId: ledger.yajmanId,
        purohitId: ledger.purohitId,
        cycleYear,
        source: "ledger",
        ledgerId: ledger.id,
        attestedBy: "both",
      })
      .onConflictDoUpdate({
        target: [occurrencesTable.eventId, occurrencesTable.cycleYear],
        set: { attestedBy: "both", ledgerId: ledger.id },
      });

    // Update denormalized cache on events
    const [event] = await db
      .select({ lastPerformedYear: eventsTable.lastPerformedYear })
      .from(eventsTable)
      .where(eq(eventsTable.id, ledger.eventId))
      .limit(1);

    if (event && (event.lastPerformedYear === null || cycleYear > event.lastPerformedYear)) {
      await db
        .update(eventsTable)
        .set({ lastPerformedYear: cycleYear })
        .where(eq(eventsTable.id, ledger.eventId));
    }
  }
}

export async function findAwaitingAmountEntry(purohitId: string): Promise<Ledger | null> {
  if (!process.env.DATABASE_URL) {
    throw new LedgerDbUnavailableError();
  }

  const { db, ledgerTable } = await import("@workspace/db");

  const [entry] = await db
    .select()
    .from(ledgerTable)
    .where(
      and(
        eq(ledgerTable.purohitId, purohitId),
        eq(ledgerTable.paymentStatus, "pending"),
        isNull(ledgerTable.amountCollected)
      )
    )
    .orderBy(desc(ledgerTable.createdAt))
    .limit(1);

  return entry ?? null;
}

export async function recordDakshinaAmount(
  ledgerId: string,
  purohitId: string,
  amount: number
): Promise<Ledger> {
  if (!process.env.DATABASE_URL) {
    throw new LedgerDbUnavailableError();
  }

  const { db, ledgerTable } = await import("@workspace/db");

  const [ledger] = await db
    .select()
    .from(ledgerTable)
    .where(eq(ledgerTable.id, ledgerId))
    .limit(1);

  if (!ledger) {
    throw new LedgerNotFoundError(`Ledger entry ${ledgerId} not found`);
  }

  if (ledger.purohitId !== purohitId) {
    throw new LedgerOwnershipError(`Purohit ${purohitId} is not authorized for ledger entry ${ledgerId}`);
  }

  if (ledger.amountCollected !== null) {
    // Idempotency: silent no-op, return existing row unchanged
    return ledger;
  }

  if (ledger.paymentStatus !== "pending") {
    throw new LedgerStateTransitionError(`Cannot record amount for ledger ${ledgerId} in status ${ledger.paymentStatus}`);
  }

  const [updated] = await db
    .update(ledgerTable)
    .set({
      amountCollected: amount.toFixed(2),
    })
    .where(eq(ledgerTable.id, ledgerId))
    .returning();

  if (!updated) {
    throw new Error(`Failed to record dakshina amount for ledger ${ledgerId}`);
  }

  return updated;
}

export async function expireStaleEntries(ttlDays: number = 14): Promise<number> {
  if (!process.env.DATABASE_URL) {
    throw new LedgerDbUnavailableError();
  }

  const { db, ledgerTable, yajmansTable, purohitsTable } = await import("@workspace/db");
  const { eq, and, lt, isNull, inArray } = await import("drizzle-orm");
  const { logger } = await import("./logger");
  const { sendWhatsappMessage } = await import("./whatsapp-client");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ttlDays);

  const staleEntries = await db
    .select({
      ledger: ledgerTable,
      yajman: yajmansTable,
      purohit: purohitsTable,
    })
    .from(ledgerTable)
    .innerJoin(yajmansTable, eq(ledgerTable.yajmanId, yajmansTable.id))
    .innerJoin(purohitsTable, eq(ledgerTable.purohitId, purohitsTable.id))
    .where(
      and(
        inArray(ledgerTable.paymentStatus, ["pending", "awaiting_corroboration"]),
        isNull(ledgerTable.amountCollected),
        lt(ledgerTable.createdAt, cutoff)
      )
    );

  if (staleEntries.length === 0) return 0;

  for (const row of staleEntries) {
    try {
      await db
        .update(ledgerTable)
        .set({ paymentStatus: "expired_uncorroborated" as any }) // Use type assertion if enum hasn't been updated
        .where(eq(ledgerTable.id, row.ledger.id));

      if (row.purohit.phoneNumber) {
        const msg = `⚠️ आपका यजमान *${row.yajman.familyName}* के लिए दक्षिणा दावा (${row.ledger.createdAt.toLocaleDateString()}) अपुष्ट रहा और समाप्त हो गया है। आवश्यकता होने पर कृपया पुनः आरंभ करें।`;
        await sendWhatsappMessage(row.purohit.phoneNumber, {
          type: "text",
          text: { body: msg }
        });
      }
    } catch (err) {
      logger.error({ err, ledgerId: row.ledger.id }, "Failed to expire stale ledger entry");
    }
  }

  return staleEntries.length;
}
