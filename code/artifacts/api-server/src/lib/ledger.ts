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

  const { db, ledgerTable } = await import("@workspace/db");

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
